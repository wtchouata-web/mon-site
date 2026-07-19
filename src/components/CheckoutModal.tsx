import React, { useState } from 'react';
import { Sale } from '../types';
import { X, CreditCard, Shield, Phone, Sparkles, CheckCircle2, Loader2, ArrowRight, Clipboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CheckoutModalProps {
  onClose: () => void;
  onPaymentSuccess: (paymentData: Omit<Sale, 'id' | 'createdAt' | 'status'> & { verificationCode?: string; planType?: string }) => void;
  feeType: 'list_fee' | 'boost_fee' | 'dynamic_plan';
  productTitle: string;
  productId: string;
  buyerName: string;
  buyerEmail: string;
  language?: 'fr' | 'en';
  productCategory?: string;
}

export default function CheckoutModal({
  onClose,
  onPaymentSuccess,
  feeType,
  productTitle,
  productId,
  buyerName,
  buyerEmail,
  language = 'fr',
  productCategory
}: CheckoutModalProps) {
  const [method, setMethod] = useState<'card' | 'orange_money' | 'mtn_money'>('orange_money');
  const [selectedPlan, setSelectedPlan] = useState<'premium' | 'classique'>(() => {
    if (feeType === 'boost_fee' || productCategory === 'Premium' || productCategory === 'Modèles VIP') {
      return 'premium';
    }
    return 'classique';
  });
  
  const isFr = language === 'fr';
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');

  // WooCommerce Gateway & Server States
  const [userTypedAmount, setUserTypedAmount] = useState('');
  const [wooOtpCode, setWooOtpCode] = useState('');
  const [enteredWooOtp, setEnteredWooOtp] = useState('');
  const [wooError, setWooError] = useState('');
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [isWooServerVerified, setIsWooServerVerified] = useState(false);

  // Real Cameroon Mobile Money API Server States
  const [serverMode, setServerMode] = useState('');
  const [serverTxnRef, setServerTxnRef] = useState('');
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);

  // States for verification code checking to prevent fraud
  const [inputCode, setInputCode] = useState('');
  const [inputError, setInputError] = useState('');

  // Form Fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  
  const [mobilePhone, setMobilePhone] = useState('');
  const [txnId, setTxnId] = useState('');

  // Define pricing dynamically based on chosen option
  const getAmount = () => {
    switch (selectedPlan) {
      case 'premium':
        return 7000;
      case 'classique':
      default:
        return 5000;
    }
  };

  // Synchronise userTypedAmount automatically when selectedPlan changes
  React.useEffect(() => {
    setUserTypedAmount(getAmount().toString());
    setWooError('');
  }, [selectedPlan]);
  const amount = getAmount();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(isFr ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: 'XAF',
      maximumFractionDigits: 0
    }).format(price).replace('XAF', 'FCFA');
  };

  const generateUniqueCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'RA-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const pollCinetPayStatus = (ref: string) => {
    setPollingStatus('pending');
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 40) { // 120 seconds timeout
        clearInterval(interval);
        setPollingStatus('failed');
        setWooError(isFr ? "Délai d'attente expiré." : "Payment verification timeout.");
        return;
      }

      try {
        const res = await fetch('/api/v2/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: ref })
        });
        let data: any = {};
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          data = await res.json();
        } else {
          return;
        }
        if (res.ok && data.success && data.data) {
          if (data.data.status === 'SUCCESSFUL') {
            clearInterval(interval);
            setPollingStatus('success');
            setSuccess(true);
            setGeneratedCode(ref);
          } else if (data.data.status === 'FAILED') {
            clearInterval(interval);
            setPollingStatus('failed');
            setWooError(isFr ? "Échec du versement." : "Payment failed.");
          }
        }
      } catch (e) {
        console.error("Error verifying payment status:", e);
      }
    }, 3000);
  };

  const handleSubmitValue = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setWooError('');
    setPollingStatus(null);

    // Ensure the amount is secure and matches exactly the expected plan tariff
    const expected = getAmount();
    const parsedAmount = parseFloat(userTypedAmount);

    if (isNaN(parsedAmount) || parsedAmount !== expected) {
      setWooError(
        isFr
          ? `Erreur de paiement : Le montant payé (${formatPrice(parsedAmount || 0)}) ne correspond pas au tarif de ${formatPrice(expected)} exigé !`
          : `Payment Error: The amount paid (${formatPrice(parsedAmount || 0)}) doesn't match the required price of ${formatPrice(expected)}!`
      );
      setProcessing(false);
      return;
    }

    // Require phone for Mobile Money
    const phone = method === 'card' ? '000000000' : mobilePhone;
    if (method !== 'card' && !phone) {
      setWooError(isFr ? "Veuillez entrer votre numéro de téléphone." : "Please enter your phone number.");
      setProcessing(false);
      return;
    }

    try {
      // Generate unique transaction reference on the fly
      const reference = `TXN-RA-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const res = await fetch('/api/v2/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'cinetpay',
          reference,
          amount: expected,
          currency: 'XAF',
          phoneNumber: phone,
          paymentMethod: method === 'card' ? 'CARD' : (method === 'orange_money' ? 'orange_money' : 'mtn_money'),
          userId: 'anonymous',
          productId,
          planType: selectedPlan
        })
      });

      let data: any = {};
      if (res.headers.get('content-type')?.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(isFr ? "Le serveur a renvoyé une réponse invalide." : "The server returned an invalid response.");
      }
      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error || (isFr ? "Erreur lors de l'initialisation du versement." : "Error initializing payment."));
      }

      const returnedUrl = data.data.paymentUrl;
      if (!returnedUrl) {
        throw new Error(isFr ? "URL de versement non renvoyée par CinetPay." : "Payment URL not returned by CinetPay.");
      }

      setPaymentUrl(returnedUrl);
      pollCinetPayStatus(reference);

    } catch (err: any) {
      setWooError(err.message || (isFr ? "Impossible d'initier la transaction." : "Could not initiate the transaction."));
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyOtpSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    setWooError('');

    if (enteredWooOtp.trim() === wooOtpCode) {
      // WooCommerce secure validation passed successfully! Set success screen
      setSuccess(true);
    } else {
      setWooError(
        isFr
          ? "Code OTP incorrect. Le serveur signale une anomalie de confirmation sur votre numéro de téléphone."
          : "Incorrect OTP code. The server reports a validation issue on your phone number."
      );
    }
  };

  const handleVerifyCodeSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError('');

    if (inputCode.trim().toUpperCase() === generatedCode.trim().toUpperCase()) {
      onPaymentSuccess({
        productId,
        productTitle: `${productTitle} [Plan: ${selectedPlan.toUpperCase()}]`,
        buyerName,
        buyerEmail,
        amount,
        feeType: selectedPlan === 'premium' ? 'boost_fee' : 'list_fee',
        paymentMethod: method,
        verificationCode: generatedCode,
        planType: selectedPlan
      });
    } else {
      setInputError(
        isFr
          ? 'Le code saisi est incorrect. Saisie obligatoire pour confirmer le versement et éviter toute fraude.'
          : 'The entered security code is incorrect. Complete entry is required to verify the deposit and avoid fraud.'
      );
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2005);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-rose-100 my-8"
      >
        {/* Modal close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 px-3 text-rose-450 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors duration-200 cursor-pointer text-xs font-bold font-sans z-20"
        >
          ✕
        </button>

        <AnimatePresence mode="wait">
          {success ? (
            /* SUCCESS PANEL WITH AUTO GENERATED UNIQUE CONFIRMATION CODE AND MANUALLY ENTERED VERIFICATION CODE */
            <motion.div
              key="success-screen"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 text-center flex flex-col justify-center min-h-[420px]"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-300">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              
              <h3 className="text-lg font-black text-slate-800">{isFr ? 'Paiement Envoyé !' : 'Payment Dispatched!'}</h3>
              <p className="text-xs text-rose-700 font-bold mt-1">
                {isFr ? 'Le code de paiement anti-fraude a été généré avec succès.' : 'The anti-fraud security code was generated successfully.'}
              </p>

              {/* Unique confirmation code card */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 w-full my-3 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 font-mono">
                  {isFr ? 'RÉFÉRENCE DE VERSEMENT GÉNÉRÉE' : 'GENERATED DEPOSIT REFERENCE'}
                </p>
                <div className="flex items-center justify-center gap-2 bg-pink-50 border border-pink-100 py-2 px-3 rounded-xl mb-2">
                  <span className="text-sm font-black text-slate-800 font-mono tracking-wider">
                    {generatedCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    type="button"
                    title={isFr ? "Copier le code" : "Copy code"}
                    className="p-1 px-2.5 bg-white border border-pink-200 hover:border-pink-400 text-pink-700 font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{copied ? (isFr ? 'Copié !' : 'Copied!') : (isFr ? 'Copier' : 'Copy')}</span>
                  </button>
                </div>
                <p className="text-[9.5px] text-slate-400 leading-tight">
                  {isFr
                    ? 'Veuillez copier ou saisir ce code ci-dessous pour confirmer votre versement de transaction et exécuter la tâche.'
                    : 'Please copy or type this security code below to confirm your deposit and execute the setup.'}
                </p>
              </div>

              {inputError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl font-bold border border-red-100 mb-2.5">
                  {inputError}
                </div>
              )}

              {/* Dedicated field to enter the security code */}
              <form onSubmit={handleVerifyCodeSubmission} className="space-y-3">
                <div className="text-left">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-sans">
                    {isFr ? 'Saisir le code dédié ci-dessous :' : 'Type the security code below:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Ex: RA-ABCD-EFGH"
                    className="w-full px-4 py-2 bg-slate-55 border border-pink-200 focus:border-pink-500 rounded-xl text-center text-xs focus:outline-hidden font-extrabold tracking-wider font-mono text-slate-805 uppercase"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-xl transition duration-300 shadow-md text-xs uppercase tracking-wider cursor-pointer font-sans"
                >
                  {isFr ? 'Confirmer et Activer la Tâche' : 'Confirm & Activate Profile'}
                </button>
              </form>
            </motion.div>
          ) : paymentUrl ? (
            /* CINETPAY GATEWAY EMBEDDED VIEW */
            <motion.div
              key="cinetpay-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 md:p-8 space-y-4 text-left"
            >
              <div className="text-center font-sans">
                <div className="w-12 h-12 mx-auto rounded-full bg-pink-50 text-pink-600 flex items-center justify-center mb-2 border border-pink-200">
                  <Phone className="w-6 h-6 animate-pulse text-pink-600" />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  {isFr ? 'Finalisez votre versement' : 'Complete your payment'}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  {isFr ? 'En attente de détection du versement CinetPay en temps réel' : 'Awaiting real-time CinetPay payment confirmation'}
                </p>
              </div>

              {/* Iframe for frictionless sandbox checkout */}
              <div className="w-full h-80 rounded-2xl border border-slate-100 overflow-hidden shadow-inner bg-slate-50">
                <iframe src={paymentUrl} className="w-full h-full border-0" title="CinetPay Gateway" />
              </div>

              {wooError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-bold border border-red-100 mb-1 leading-snug text-left">
                  ⚠️ {wooError}
                </div>
              )}

              {/* Direct button fallback */}
              <div className="text-center space-y-1 pt-1">
                <a 
                  href={paymentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 py-2 px-4 rounded-xl transition cursor-pointer"
                >
                  <span>{isFr ? "Ouvrir CinetPay dans un onglet externe" : "Open CinetPay in external tab"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
                <p className="text-[9px] text-slate-450 leading-normal">
                  {isFr 
                    ? "Dès que le versement est validé, cet écran se mettra à jour automatiquement." 
                    : "As soon as the payment is validated, this screen will auto-update."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPaymentUrl('');
                  setWooError('');
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs uppercase cursor-pointer transition font-sans border border-slate-200"
              >
                {isFr ? 'Retour / Choisir autre méthode' : 'Back / Choose other method'}
              </button>
            </motion.div>
          ) : (
            /* CHECKOUT SELECTOR & FORM SCREEN */
            <motion.div key="form-screen" className="p-6 md:p-8 font-sans">
              {/* Product Info header summary */}
              <div className="mb-4">
                <div className="flex items-center gap-1.5 text-xs text-rose-700 font-bold mb-1">
                  <span className="flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-[10px] border border-rose-100 uppercase font-black">
                    {isFr ? 'Paiement Service Rencontres' : 'Dating Service Payment'}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-850 leading-tight">{isFr ? 'Validation & Activation' : 'Validation & Activation'}</h3>
                <p className="text-[10px] text-slate-400 font-medium">{isFr ? 'Pour' : 'For'} {productTitle}</p>
              </div>

              {/* Step 1: Tariffs selection (Les prix sont fixes) */}
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-1.5">
                  {isFr ? 'Options & Tarifs de publication (5 jours)' : 'Options & Posting Rates (5 days)'}
                </label>
                <div className="space-y-1.5">
                  {/* Premium publication */}
                  <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                    selectedPlan === 'premium' 
                      ? 'border-pink-400 bg-pink-50/40 text-slate-850 shadow-2xs font-bold' 
                      : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:border-pink-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="plan" 
                        checked={selectedPlan === 'premium'} 
                        onChange={() => setSelectedPlan('premium')}
                        className="accent-pink-600" 
                      />
                      <div className="text-left font-sans">
                        <span className="text-xs font-extrabold text-slate-800">{isFr ? 'BOOST VIP (PREMIUM) ⭐' : 'VIP BOOST (PREMIUM) ⭐'}</span>
                        <p className="text-[9px] text-pink-700 font-semibold">{isFr ? 'Fiche Premium active pendant 5 jours' : 'Premium listing active for 5 days'}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black font-mono text-pink-600">7 000 FCFA</span>
                  </label>

                  {/* Classique publication */}
                  <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                    selectedPlan === 'classique' 
                      ? 'border-pink-400 bg-pink-50/40 text-slate-850 shadow-2xs font-bold' 
                      : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:border-pink-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="plan" 
                        checked={selectedPlan === 'classique'} 
                        onChange={() => setSelectedPlan('classique')}
                        className="accent-pink-600"
                      />
                      <div className="text-left font-sans">
                        <span className="text-xs font-extrabold text-slate-800">{isFr ? 'POSITION CLASSIQUE 📜' : 'CLASSIC POSITION 📜'}</span>
                        <p className="text-[9px] text-pink-650 font-semibold">{isFr ? 'Fiche Classique active pendant 5 jours' : 'Classic listing active for 5 days'}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black font-mono text-pink-600 font-bold">5 000 FCFA</span>
                  </label>
                </div>
              </div>

              {/* Step 2: Payment Gateway Tab */}
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">
                {isFr ? 'Moyen de versement' : 'Payment gateway method'}
              </label>
              <div className="grid grid-cols-3 gap-1.5 mb-4">
                {/* Orange Money */}
                <button
                  type="button"
                  onClick={() => setMethod('orange_money')}
                  className={`flex flex-col items-center justify-center py-2 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    method === 'orange_money'
                      ? 'border-orange-500 bg-orange-50/50 text-orange-950 shadow-3xs font-extrabold'
                      : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <div className="text-[10px] font-black tracking-tighter bg-orange-500 text-white px-2 py-0.5 rounded-full mb-1 leading-none">
                    OM
                  </div>
                  <span className="text-[10px]">Orange Money</span>
                </button>

                {/* MTN Money */}
                <button
                  type="button"
                  onClick={() => setMethod('mtn_money')}
                  className={`flex flex-col items-center justify-center py-2 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    method === 'mtn_money'
                      ? 'border-yellow-500 bg-yellow-50/50 text-yellow-950 shadow-3xs font-extrabold'
                      : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="text-[10px] font-black tracking-tighter bg-yellow-500 text-slate-900 px-2 py-0.5 rounded-full mb-1 leading-none">
                    MTN
                  </div>
                  <span className="text-[10px]">MTN MoMo</span>
                </button>

                {/* Card */}
                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className={`flex flex-col items-center justify-center py-2 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    method === 'card'
                      ? 'border-pink-500 bg-pink-50/50 text-pink-905 shadow-3xs font-extrabold'
                      : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-pink-600 mb-1" />
                  <span className="text-[10px]">{isFr ? 'Carte' : 'Credit Card'}</span>
                </button>
              </div>

              {/* Dynamic form */}
              <form onSubmit={handleSubmitValue} className="space-y-4">
                {method === 'card' ? (
                  /* CARD INFO FORM */
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 font-sans">{isFr ? 'Numéro de carte' : 'Card number'}</label>
                      <input
                        type="text"
                        required
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4000 1234 5678 9010"
                        className="w-full px-3 py-1.5 bg-slate-55 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-pink-500 font-medium font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 font-sans">Expiration</label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/AA"
                          className="w-full px-4 py-1.5 bg-slate-55 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-pink-500 font-medium font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 font-sans">{isFr ? 'Code CVC' : 'CVC Code'}</label>
                        <input
                          type="password"
                          required
                          maxLength={3}
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="123"
                          className="w-full px-4 py-1.5 bg-slate-55 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-pink-500 font-medium font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* MOBILE MONEY FORM - Direct instructions for MTN 678552246 / Orange 659228516 */
                  <div className="space-y-3 font-sans">
                    <div className="bg-amber-50/65 border border-amber-200/50 rounded-2xl p-3 text-[11px] text-slate-700 leading-relaxed">
                      <p className="font-extrabold text-amber-805 mb-1">{isFr ? '📲 Instructions obligatoires de transfert :' : '📲 Mandatory Transfer Guidelines:'}</p>
                      {method === 'orange_money' ? (
                        isFr ? (
                          <p>
                            Composez le <strong>*150#</strong> sur votre téléphone, puis effectuez un versement de <strong>{formatPrice(amount)}</strong> vers le numéro Orange de l'administrateur : <strong className="text-orange-600 underline text-xs font-mono font-black">659 22 85 16</strong>.
                          </p>
                        ) : (
                          <p>
                            Dial <strong>*150#</strong> on your phone, then execute a transfer of <strong>{formatPrice(amount)}</strong> to the owner Orange Mobile Money wallet: <strong className="text-orange-600 underline text-xs font-mono font-black">659 22 85 16</strong>.
                          </p>
                        )
                      ) : (
                        isFr ? (
                          <p>
                            Composez le <strong>*126#</strong> sur votre téléphone, puis effectuez un versement de <strong>{formatPrice(amount)}</strong> vers le numéro MTN de l'administrateur : <strong className="text-yellow-600 underline text-xs font-mono font-black">678 55 22 46</strong>.
                          </p>
                        ) : (
                          <p>
                            Dial <strong>*126#</strong> on your phone, then execute a transfer of <strong>{formatPrice(amount)}</strong> to the owner MTN Mobile Money wallet: <strong className="text-yellow-600 underline text-xs font-mono font-black">678 55 22 46</strong>.
                          </p>
                        )
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                       <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          {isFr ? `Votre Numéro (${method === 'orange_money' ? 'Orange' : 'MTN'})` : `Your Number (${method === 'orange_money' ? 'Orange' : 'MTN'})`}
                        </label>
                        <input
                          type="tel"
                          required
                          value={mobilePhone}
                          onChange={(e) => setMobilePhone(e.target.value)}
                          placeholder="Ex: 6xx xx xx xx"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-pink-400 font-medium font-mono"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">{isFr ? 'Ref Transaction / ID' : 'Transaction Ref / ID'}</label>
                        <input
                          type="text"
                          required
                          value={txnId}
                          onChange={(e) => setTxnId(e.target.value)}
                          placeholder={isFr ? "Code de reçu MoMo" : "MoMo Receipt Reference"}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-pink-400 font-medium text-slate-80d uppercase font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* WooCommerce verification setup */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5 text-left">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    {isFr ? "💰 Montant à payer (Vérifié par WooCommerce) :" : "💰 Amount to pay (Verified by WooCommerce):"}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={userTypedAmount}
                      onChange={(e) => setUserTypedAmount(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-rose-450 rounded-xl text-xs font-black tracking-wider text-rose-700 font-mono focus:outline-hidden"
                    />
                    <div className="text-[9px] text-slate-400 font-medium mt-1 leading-snug">
                      {isFr 
                        ? `Le montant du serveur est unique et inchangé. Tarifs exige : Premium = 7 000 FCFA | Classique = 5 000 FCFA. S'il est altéré, Rose Amour signalera une erreur de paiement.`
                        : `Billed payment is unique and unchanged. Required rates: Premium = 7 000 FCFA | Classic = 5 000 FCFA. If altered, Rose Amour will trigger a payment error.`}
                    </div>
                  </div>
                </div>

                {wooError && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-bold border border-red-100/80 leading-snug text-left">
                    ⚠️ {wooError}
                  </div>
                )}

                {/* Secure network prompt */}
                <div className="flex items-center gap-1.5 p-2 bg-rose-50/30 border border-rose-100 rounded-xl text-[9px] text-pink-700 font-semibold font-sans">
                  <Shield className="w-3.5 h-3.5 text-pink-505 shrink-0" />
                  <span>{isFr ? 'Passerelle Orange & MTN certifiée. Administration Rose Amour.' : 'Certified Orange & MTN MoMo Gateway. Rose Amour Administration.'}</span>
                </div>

                <button
                  type="submit"
                  disabled={processing}
                  className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:bg-pink-300 cursor-pointer disabled:cursor-not-allowed shadow-md text-xs uppercase font-sans"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isFr ? 'Vérification WooCommerce...' : 'WooCommerce Verification...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isFr ? `Valider et payer ${formatPrice(amount)}` : `Validate & pay ${formatPrice(amount)}`}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
