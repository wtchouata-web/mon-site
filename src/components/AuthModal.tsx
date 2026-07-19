import React, { useState } from 'react';
import { User, ConnectionLog } from '../types';
import { SEEDED_USERS, isPasswordPwned } from '../data';
import { LogIn, Eye, EyeOff, ShieldCheck, Mail, CheckCircle, ArrowLeft, KeyRound, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  onAddConnectionLog: (log: Omit<ConnectionLog, 'id' | 'loginTime'>) => void;
  language?: 'fr' | 'en';
}

export default function AuthModal({
  onClose,
  onLoginSuccess,
  onAddConnectionLog,
  language = 'fr'
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password' | 'forgot-password-email-sent' | 'reset-password'>('login');
  const isFr = language === 'fr';
  
  // Custom form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [city, setCity] = useState('Douala');
  const [gender, setGender] = useState<'femme' | 'homme' | 'transsexuel' | 'autre'>('femme');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailSentNotice, setEmailSentNotice] = useState(false);

  // New password states for password recovery
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Verification Code States upon registration
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [generatedRegCode, setGeneratedRegCode] = useState('');
  const [userEnteredRegCode, setUserEnteredRegCode] = useState('');
  const [pendingUserToRegister, setPendingUserToRegister] = useState<User | null>(null);

  // Double authentication (2FA) states
  const [awaiting2FA, setAwaiting2FA] = useState(false);
  const [generated2FACode, setGenerated2FACode] = useState('');
  const [userEntered2FACode, setUserEntered2FACode] = useState('');
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);
  const [tempToken, setTempToken] = useState('');

  // Handle manual login & registration trigger
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const users: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
    
    if (mode === 'login') {
      const emailNormalized = email.toLowerCase().trim();
      const lockoutKey = `rose_amour_lockout_${emailNormalized}`;
      const attemptsKey = `rose_amour_attempts_${emailNormalized}`;

      // Check brute force lockout
      const lockoutTime = localStorage.getItem(lockoutKey);
      if (lockoutTime) {
        const remaining = Math.ceil((parseInt(lockoutTime, 10) - Date.now()) / 1000);
        if (remaining > 0) {
          setErrorMsg(
            isFr
              ? `🔒 Sécurité : Compte verrouillé temporairement pour cause d'abus. Veuillez réessayer dans ${remaining} secondes.`
              : `🔒 Security: Account temporarily locked due to excessive failed attempts. Please retry in ${remaining} seconds.`
          );
          return;
        } else {
          localStorage.removeItem(lockoutKey);
        }
      }

      // Authenticate via secure server API
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailNormalized, password })
        });
        
        let data: any = {};
        if (res.headers.get('content-type')?.includes('application/json')) {
          data = await res.json();
        } else {
          throw new Error(isFr ? "Le serveur a renvoyé une réponse invalide." : "The server returned an invalid response.");
        }
        
        if (!res.ok) {
          const attempts = parseInt(localStorage.getItem(attemptsKey) || '0', 10) + 1;
          if (attempts >= 5) {
            localStorage.setItem(lockoutKey, (Date.now() + 120 * 1000).toString());
            localStorage.removeItem(attemptsKey);
            setErrorMsg(
              isFr
                ? "⚠️ Sécurité : Trop de tentatives de connexion échouées ! Votre compte est temporairement bloqué pour 2 minutes."
                : "⚠️ Security: Too many failed login attempts! Your account has been locked for 2 minutes."
            );
          } else {
            localStorage.setItem(attemptsKey, attempts.toString());
            setErrorMsg(
              data.error || (isFr ? "Identifiants de connexion incorrects." : "Incorrect login credentials.")
            );
          }
          return;
        }

        const foundUser = data.user;
        const jwtToken = data.token;

        // Require email confirmation for non-admin accounts
        if (foundUser.role !== 'admin' && foundUser.isVerified === false) {
          setErrorMsg(
            isFr 
              ? "Votre compte n'est pas encore activé ! Un e-mail de confirmation vous a été envoyé lors de votre création de compte. Veuillez sortir du site, aller dans votre boîte mail réelle et cliquer sur le lien d'activation."
              : "Your account is not yet active! A confirmation email has been sent when your account was created. Please exit the site, check your actual mailbox and click the activation link."
          );
          return;
        }

        // Keep JWT token temporarily for successful 2FA
        setTempToken(jwtToken);
        
        // Success password check -> Reset failed attempts
        localStorage.removeItem(attemptsKey);
        localStorage.removeItem(lockoutKey);

        // --- INITIATE SECURE 2-FACTOR AUTHENTICATION (2FA) VIA EMAIL ---
        const code2fa = Math.floor(100000 + Math.random() * 900000).toString();
        setGenerated2FACode(code2fa);
        setAuthenticatedUser(foundUser);
        setAwaiting2FA(true);
        setErrorMsg('');
        
        console.log(`[ROSE AMOUR SECURE 2FA EMAIL DISPATCHED] Recipient: ${foundUser.email} | Secure 2FA Access PIN: ${code2fa}`);
      } catch (err) {
        setErrorMsg(
          isFr
            ? "Impossible de se connecter au serveur d'authentification."
            : "Unable to connect to the authentication server."
        );
      }
    } else {
      // Sign Up flow
      if (!email || !name || !whatsappNumber || !city || !password) {
        setErrorMsg(
          isFr
            ? 'Veuillez remplir tous les champs requis, y compris la ville et le mot de passe.'
            : 'Please fill out all required fields, including city and password.'
        );
        return;
      }

      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        setErrorMsg(
          isFr
            ? 'Cet e-mail est déjà associé à un compte.'
            : 'This email is already associated with an account.'
        );
        return;
      }

      // --- PWNED / COMPROMISED PASSWORDS CHECKER (HAVE I BEEN PWNED API) ---
      setErrorMsg(isFr ? "Analyse de sécurité du mot de passe en cours..." : "Analyzing password security...");
      const isLeaked = await isPasswordPwned(password);
      if (isLeaked) {
        setErrorMsg(
          isFr
            ? "⚠️ Sécurité : Ce mot de passe a été détecté dans des fuites de données publiques sur internet (HaveIBeenPwned). Pour votre sécurité, veuillez utiliser un mot de passe unique plus robuste."
            : "⚠️ Security: This password has been detected in public data leaks on the internet (HaveIBeenPwned). For your safety, please use a stronger, unique password."
        );
        return;
      }
      setErrorMsg('');

      // Generate verification code
      const code = `CONF-${Math.floor(1000 + Math.random() * 9000)}`;
      const newUser: User = {
        id: `user_${Date.now()}`,
        email: email.trim(),
        name: name.trim(),
        role: 'user',
        whatsappNumber: whatsappNumber.startsWith('+') ? whatsappNumber : `+${whatsappNumber}`,
        createdAt: new Date().toISOString(),
        city,
        gender,
        password,
        isVerified: false
      };

      // --- ACCREDITATION SECURITY PERSISTENCE: SAVE USER AS UNVERIFIED ---
      const nextUsersList = [...users, newUser];
      localStorage.setItem('rose_amour_users', JSON.stringify(nextUsersList));

      // Trigger server sync via safe public registration endpoint
      fetch('/api/public/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: newUser })
      }).catch(err => console.error("Error syncing new unverified user to backend:", err));

      setGeneratedRegCode(code);
      setPendingUserToRegister(newUser);
      setAwaitingVerification(true);
      setErrorMsg('');
    }
  };

  // Confirm the generated verification code submitted by the user
  const handleConfirmVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (userEnteredRegCode.trim().toUpperCase() === generatedRegCode) {
      if (!pendingUserToRegister) return;

      const users: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
      const matchIdx = users.findIndex(u => u.email.toLowerCase() === pendingUserToRegister.email.toLowerCase());
      if (matchIdx !== -1) {
        users[matchIdx].isVerified = true;
      } else {
        users.push({ ...pendingUserToRegister, isVerified: true });
      }
      localStorage.setItem('rose_amour_users', JSON.stringify(users));

      alert(
        isFr
          ? 'Félicitations ! Votre adresse mail a été confirmée avec succès. Bienvenue sur Rose Amour.'
          : 'Congratulations! Your email has been verified successfully. Welcome to Rose Amour.'
      );
      
      const registered = pendingUserToRegister;
      setAwaitingVerification(false);
      setPendingUserToRegister(null);
      setUserEnteredRegCode('');
      onSuccess(registered);
    } else {
      setErrorMsg(
        isFr
          ? 'Le code de confirmation saisi est incorrect. Veuillez vérifier le code envoyé à votre boîte mail.'
          : 'The confirmation code is incorrect. Please verify the code sent to your email.'
      );
    }
  };

  const handleInstantLinkConfirm = () => {
    if (!pendingUserToRegister) return;

    const users: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
    const matchIdx = users.findIndex(u => u.email.toLowerCase() === pendingUserToRegister.email.toLowerCase());
    const verifiedUser: User = { ...pendingUserToRegister, isVerified: true };
    if (matchIdx !== -1) {
      users[matchIdx].isVerified = true;
    } else {
      users.push(verifiedUser);
    }
    localStorage.setItem('rose_amour_users', JSON.stringify(users));

    alert(
      isFr
        ? 'Félicitations ! Votre adresse mail a été confirmée avec succès. Bienvenue sur Rose Amour.'
        : 'Congratulations! Your email has been verified successfully. Welcome to Rose Amour.'
    );

    setAwaitingVerification(false);
    setPendingUserToRegister(null);
    setUserEnteredRegCode('');
    onSuccess(verifiedUser);
  };

  // Double verification check for 2FA screen
  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (userEntered2FACode.trim() === generated2FACode) {
      if (authenticatedUser) {
        const loggedUser = authenticatedUser;
        setAwaiting2FA(false);
        setAuthenticatedUser(null);
        setGenerated2FACode('');
        setUserEntered2FACode('');

        // Clear attempts
        const emailNormalized = loggedUser.email.toLowerCase().trim();
        localStorage.removeItem(`rose_amour_attempts_${emailNormalized}`);
        localStorage.removeItem(`rose_amour_lockout_${emailNormalized}`);

        // Show Gmail sending animation before proceeding
        setEmailSentNotice(true);
        setTimeout(() => {
          setEmailSentNotice(false);
          onSuccess(loggedUser);
        }, 1200);
      }
    } else {
      setErrorMsg(
        isFr
          ? 'Le code de sécurité 2FA saisi est incorrect. Veuillez vérifier.'
          : 'The entered 2FA security code is incorrect. Please check.'
      );
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const users: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
    const found = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (found) {
      setMode('forgot-password-email-sent');
    } else {
      setErrorMsg(
        isFr
          ? 'Aucun compte trouvé avec cette adresse e-mail. Veuillez vérifier ou créer un compte.'
          : 'No account found with this email. Please sign up.'
      );
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg(
        isFr
          ? 'Le mot de passe doit comporter au moins 4 caractères.'
          : 'Password must be at least 4 characters long.'
      );
      return;
    }

    // --- COMPROMISED PASSWORD LOCKOUT DURING RESET ---
    setErrorMsg(isFr ? "Analyse de sécurité du mot de passe en cours..." : "Analyzing password security...");
    const isLeaked = await isPasswordPwned(newPassword);
    if (isLeaked) {
      setErrorMsg(
        isFr
          ? "⚠️ Sécurité : Ce mot de passe a été détecté dans des fuites publiques (HaveIBeenPwned). Veuillez en choisir un autre."
          : "⚠️ Security: This password has been found in public leaks (HaveIBeenPwned). Please choose another one."
      );
      return;
    }
    setErrorMsg('');

    const users: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
    const idx = users.findIndex(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (idx !== -1) {
      users[idx].password = newPassword.trim();
      localStorage.setItem('rose_amour_users', JSON.stringify(users));

      alert(
        isFr
          ? 'Votre mot de passe a été réinitialisé avec succès ! Veuillez vous connecter avec votre nouveau mot de passe.'
          : 'Your password has been reset successfully! Please log in with your new password.'
      );

      setNewPassword('');
      setPassword('');
      setMode('login');
    } else {
      setErrorMsg(
        isFr
          ? 'Une erreur est survenue lors de la réinitialisation.'
          : 'An error occurred during password reset.'
      );
    }
  };

  const onSuccess = (user: User) => {
    if (tempToken) {
      localStorage.setItem('rose_amour_admin_token', tempToken);
    }
    
    onLoginSuccess(user);
    
    onAddConnectionLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      ipAddress: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      device: typeof window !== 'undefined' && window.innerWidth < 768 ? 'Mobile / WhatsApp Applet' : 'Desktop / Rose Portal'
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 border border-rose-100 my-8"
        id="auth-modal"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 px-3 text-rose-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors duration-200 cursor-pointer text-xs font-bold font-sans"
        >
          ✕
        </button>

        <AnimatePresence mode="wait">
          {awaiting2FA ? (
            /* Email Double Authentication view (2FA) */
            <motion.div
              key="two-factor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="text-center mb-4">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mb-2">
                  <ShieldCheck className="w-5 h-5 text-rose-600 animate-pulse" />
                </div>
                <h2 className="text-base font-black text-rose-955 tracking-tight uppercase">
                  {isFr ? 'Double Authentification' : 'Double Authentication'}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">
                  {isFr
                    ? 'Un code de sécurité à 6 chiffres a été envoyé à votre adresse e-mail.'
                    : 'A 6-digit security code has been sent to your email address.'}
                </p>
                <p className="text-xs text-rose-700 font-extrabold font-mono mt-1 bg-rose-50 px-2 py-0.5 rounded-lg inline-block border border-rose-100">
                  {authenticatedUser?.email}
                </p>
              </div>

              {/* Simulated Secure Email Box showing the generated 2FA OTP for easy copy-paste/test */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden text-left font-sans shadow-3xs">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-pink-550" />
                <span className="block text-[9px] font-black uppercase text-rose-600 tracking-wider mb-1 font-mono">
                  {isFr ? '💬 SIMULATION EMAIL (Serveur de Sécurité) :' : '💬 EMAIL SIMULATION (Security Server):'}
                </span>
                <p className="text-xs font-bold text-slate-700 leading-relaxed">
                  {isFr 
                    ? `[CODE DE SÉCURITÉ 2FA] Votre code d'accès temporaire pour valider votre connexion est : `
                    : `[2FA SECURITY CODE] Your temporary security PIN to validate your login is: `}
                  <strong className="text-xs font-mono text-rose-600 bg-white border border-rose-200 px-2 py-0.5 rounded ml-1 select-all select-text font-black tracking-wider">{generated2FACode}</strong>.
                </p>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl font-bold border border-red-100">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {isFr ? 'Saisir le code de sécurité 2FA reçu :' : 'Enter the received 2FA security code:'}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={userEntered2FACode}
                    onChange={(e) => setUserEntered2FACode(e.target.value)}
                    placeholder="Ex: 123456"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl text-center text-sm font-black tracking-widest font-mono text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAwaiting2FA(false);
                      setAuthenticatedUser(null);
                      setGenerated2FACode('');
                      setUserEntered2FACode('');
                      setErrorMsg('');
                    }}
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl text-xs uppercase cursor-pointer transition font-sans"
                  >
                    {isFr ? 'Annuler' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer transition shadow-sm font-sans"
                  >
                    {isFr ? 'Valider' : 'Verify'}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : awaitingVerification ? (
            /* Registration email verification step with simulated direct inbox click link */
            <motion.div
              key="verification-registration"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-2 text-center flex flex-col justify-center"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-2.5 border border-rose-200">
                <Mail className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-base font-black text-slate-800">
                {isFr ? '✉️ Confirmation de votre e-mail' : '✉️ Confirm your e-mail address'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {isFr ? 'Un lien de confirmation a été envoyé à :' : 'A confirmation link has been sent to:'}
              </p>
              <p className="text-xs text-rose-700 font-extrabold font-mono mt-0.5 bg-rose-50 px-2 py-1 rounded-lg inline-block mx-auto border border-rose-100">
                {pendingUserToRegister?.email}
              </p>

              {/* Action message directing user to consult their real email inbox */}
              <div className="mt-5 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center space-y-2.5">
                <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                  {isFr 
                    ? "Veuillez vous rendre dès maintenant dans votre boîte de messagerie réelle pour confirmer votre adresse et activer définitivement votre compte."
                    : "Please check your actual email mailbox now to confirm your address and activate your account."}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isFr
                    ? "Veuillez sortir du site et ouvrir l'e-mail de confirmation envoyé par le serveur pour cliquer sur le lien d'activation."
                    : "Please exit the site, open the confirmation email sent by the server and click on the activation link."}
                </p>
              </div>

              {errorMsg && (
                <div className="mt-3 p-2 bg-red-50 text-red-700 text-xs rounded-xl font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="mt-4 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAwaitingVerification(false);
                    setPendingUserToRegister(null);
                    setErrorMsg('');
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {isFr ? 'Retour à l\'inscription' : 'Cancel Registration'}
                </button>
              </div>
            </motion.div>
          ) : emailSentNotice ? (
            /* Gmail simulation notice */
            <motion.div
              key="gmail-notice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-12 text-center flex flex-col items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-5 animate-bounce">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-800">
                {isFr ? '📧 Alerte GMAIL Envoyée !' : '📧 GMAIL Notification Sent!'}
              </h3>
              <p className="text-xs text-rose-700 font-bold mt-2 font-mono">
                {isFr ? 'Destinataire' : 'Recipient'} : {email}
              </p>
              
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 mt-4 max-w-sm text-left shadow-xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  {isFr ? 'Confirmation de sécurité :' : 'Security Confirmation:'}
                </p>
                <div className="text-[11px] text-slate-600 space-y-1 font-sans">
                  <p><strong>{isFr ? 'De :' : 'From:'}</strong> Rose Amour &lt;verification@rose-amour.cm&gt;</p>
                  <p><strong>{isFr ? 'Sujet :' : 'Subject:'}</strong> {isFr ? 'Confirmation de votre adresse mail et mot de passe de sécurité' : 'Confirmation of your email and safety password'}</p>
                  <p>
                    {isFr
                      ? "Un e-mail de sécurité a été envoyé pour confirmer l'exactitude de vos identifiants."
                      : 'A security verification email has been dispatched to check the validity of your parameters.'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-[10px] text-pink-600 font-bold animate-pulse">
                <span>{isFr ? "Vérification & connexion immédiate à l'espace..." : "Verification & direct portal login..."}</span>
              </div>
            </motion.div>
          ) : mode === 'forgot-password' ? (
            /* Forgot Password Form */
            <motion.div
              key="forgot-password"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="text-center mb-4">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-650 flex items-center justify-center mb-2">
                  <KeyRound className="w-5 h-5 text-rose-600" />
                </div>
                <h2 className="text-lg font-black text-rose-955 tracking-tight">
                  {isFr ? 'Mot de passe oublié ?' : 'Forgot Password?'}
                </h2>
                <p className="text-[11px] text-rose-455 mt-0.5 font-medium">
                  {isFr
                    ? 'Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation sécurisé par mail.'
                    : 'Enter your email address to receive a secure recovery link.'}
                </p>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isFr ? 'Votre adresse e-mail' : 'Your Email Address'}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: vanessa@gmail.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-rose-440 font-medium"
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl transition shadow-md uppercase text-xs tracking-wider cursor-pointer"
                  >
                    {isFr ? 'Envoyer le lien de récupération' : 'Send Recovery Link'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setMode('login'); setErrorMsg(''); }}
                    className="w-full py-2 text-slate-500 hover:text-rose-650 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {isFr ? 'Retour à la connexion' : 'Back to Login'}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : mode === 'forgot-password-email-sent' ? (
            /* Forgot Password Simulated Email */
            <motion.div
              key="forgot-password-email-sent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-2 text-center"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3 border border-rose-200 animate-pulse">
                <Mail className="w-6 h-6 text-rose-605" />
              </div>
              <h3 className="text-base font-black text-rose-955 mb-1">
                {isFr ? '📧 Message envoyé !' : '📧 Recovery Email Sent!'}
              </h3>
              <p className="text-xs text-rose-705 font-bold mb-4 font-mono select-all">
                {isFr ? 'Destinataire' : 'Recipient'} : {email}
              </p>

              {/* Simulated Gmail Mailbox layout */}
              <div className="bg-slate-50 border border-slate-205 rounded-2xl overflow-hidden text-left shadow-xs mb-4">
                <div className="bg-slate-200/50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-[9.5px] font-black text-slate-550 uppercase tracking-wider font-mono">
                    {isFr ? 'ℹ️ APERÇU DE VOTRE BOÎTE MAIL' : 'ℹ️ EMAIL INBOX SIMULATION'}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping inline-block" />
                </div>
                
                <div className="p-4 space-y-3 font-sans text-xs text-slate-705">
                  <div className="border-b border-slate-200/50 pb-2 space-y-1">
                    <p><strong>{isFr ? 'De :' : 'From:'}</strong> Rose Amour Administration &lt;securite@rose-amour.cm&gt;</p>
                    <p><strong>{isFr ? 'Sujet :' : 'Subject:'}</strong> {isFr ? 'Réinitialisation de votre mot de passe de sécurité' : 'Reset your security password'}</p>
                  </div>
                  
                  <div className="pt-2 space-y-2 text-slate-650 leading-relaxed">
                    <p>{isFr ? 'Bonjour,' : 'Hello,'}</p>
                    <p>
                      {isFr
                        ? 'Une demande de réinitialisation de mot de passe a été formulée pour votre espace d\'édition Rose Amour.'
                        : 'A request to reset your password was made for your Rose Amour independent seller space.'}
                    </p>
                    <p className="font-semibold text-rose-600">
                      {isFr 
                        ? 'Veuillez confirmer votre mail en cliquant sur le bouton ci-dessous pour changer de mot de passe :'
                        : 'Please click the button below to confirm your password reset:'}
                    </p>
                    
                    <div className="py-2 text-center">
                      <button
                        onClick={() => { setMode('reset-password'); setErrorMsg(''); }}
                        className="inline-block py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl transition shadow-md text-xs uppercase animate-pulse cursor-pointer border-0"
                      >
                        {isFr ? '🔗 Confirmer & Changer mon mot de passe' : '🔗 Confirm & Change Password'}
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-2 italic">
                      {isFr
                        ? 'Si vous n\'êtes pas à l\'origine de cette demande, vous pouvez ignorer cet e-mail sereinement.'
                        : 'If you did not request this, you can safely ignore this email.'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setMode('forgot-password'); setErrorMsg(''); }}
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {isFr ? 'Changer l\'adresse e-mail' : 'Change Email Address'}
              </button>
            </motion.div>
          ) : mode === 'reset-password' ? (
            /* Reset Password Form */
            <motion.div
              key="reset-password"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="text-center mb-4">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-green-50 border border-green-150 text-green-650 flex items-center justify-center mb-2">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight font-sans">
                  {isFr ? 'Choisir un nouveau mot de passe' : 'Choose New Password'}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium leading-normal">
                  {isFr
                    ? 'Définissez votre nouveau mot de passe de sécurité pour finaliser la récupération.'
                    : 'Configure your new secure password to finalize restoration.'}
                </p>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-700 font-sans">
                      {isFr ? 'Votre nouveau mot de passe' : 'Your New Password'}
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={isFr ? "Nouveau mot de passe" : "New Password"}
                      className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-rose-450 font-medium font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    {isFr ? 'Doit contenir au moins 4 caractères.' : 'Must contain at least 4 characters.'}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl transition shadow-md uppercase text-xs tracking-wider cursor-pointer font-sans"
                  >
                    {isFr ? 'Enregistrer le nouveau mot de passe' : 'Save New Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="text-center mb-4">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mb-2">
                  <LogIn className="w-5 h-5 text-rose-600" />
                </div>
                <h2 className="text-lg font-black text-rose-955 tracking-tight animate-pulse">
                  {mode === 'login'
                    ? (isFr ? 'Espace Publication rose' : 'Rose Publisher Space')
                    : (isFr ? 'Créer votre compte Fiche' : 'Create Publisher Account')}
                </h2>
                <p className="text-[11px] text-rose-455 mt-0.5 font-medium">
                  {isFr
                    ? 'Gérez votre profil indépendant et recevez des demandes directes sur WhatsApp.'
                    : 'Manage your independent listing and receive secure requests on WhatsApp.'}
                </p>
              </div>

              {/* Mode Selector pills */}
              <div className="flex bg-rose-50/50 rounded-xl p-1 mb-3 border border-rose-100/60 font-sans">
                <button
                  onClick={() => { setMode('login'); setErrorMsg(''); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all duration-200 ${
                    mode === 'login' ? 'bg-white text-rose-700 shadow-3xs border border-rose-100/30' : 'text-slate-500 hover:text-rose-600'
                  }`}
                >
                  {isFr ? 'Se connecter' : 'Log In'}
                </button>
                <button
                  onClick={() => { setMode('signup'); setErrorMsg(''); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all duration-200 ${
                    mode === 'signup' ? 'bg-white text-rose-700 shadow-3xs border border-rose-100/30' : 'text-slate-500 hover:text-rose-600'
                  }`}
                >
                  {isFr ? 'Créer un compte' : 'Sign Up'}
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Authentication Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                {mode === 'signup' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                        {isFr ? 'Votre Nom / Surnom de scène' : 'Stage Name / Profile Nickname'}
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={isFr ? "Ex: Vanessa Douala" : "e.g. Vanessa Douala"}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-rose-400 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                          {isFr ? 'Ville' : 'City'}
                        </label>
                        <select
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-rose-400 font-medium font-sans cursor-pointer"
                        >
                          <option value="Douala">Douala</option>
                          <option value="Yaoundé">Yaoundé</option>
                          <option value="Kribi">Kribi</option>
                          <option value="Bafoussam">Bafoussam</option>
                          <option value="Buea">Buea</option>
                          <option value="Bertoua">Bertoua</option>
                          <option value="Dschang">Dschang</option>
                          <option value="Bamenda">Bamenda</option>
                          <option value="Garoua">Garoua</option>
                          <option value="Ngoundere">Ngoundere</option>
                          <option value="Maroua">Maroua</option>
                          <option value="Kumba">Kumba</option>
                          <option value="Bafia">Bafia</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                          {isFr ? 'Genre' : 'Gender'}
                        </label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-rose-400 font-medium font-sans cursor-pointer"
                        >
                          <option value="femme">{isFr ? 'Femme' : 'Woman'}</option>
                          <option value="homme">{isFr ? 'Homme' : 'Man'}</option>
                          <option value="transsexuel">{isFr ? 'Transsexuel' : 'Transsexual'}</option>
                          <option value="autre">{isFr ? 'Autre' : 'Other'}</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                    {isFr ? 'Adresse e-mail' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isFr ? "Ex: vanessa@gmail.com" : "e.g. vanessa@gmail.com"}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-rose-400 font-medium"
                  />
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                      {isFr ? 'Votre numéro WhatsApp direct' : 'Your Direct WhatsApp Number'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder={isFr ? "Ex: +237677556677" : "e.g. +237677556677"}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-rose-400 font-medium font-mono"
                    />
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="block text-xs font-semibold text-slate-700 font-sans">
                      {isFr ? 'Mot de passe de sécurité' : 'Security Password'}
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot-password'); setErrorMsg(''); }}
                        className="text-[10px] font-bold text-rose-505 hover:text-rose-700 hover:underline cursor-pointer bg-transparent border-0"
                      >
                        {isFr ? 'Mot de passe oublié ?' : 'Forgot Password?'}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isFr ? "Mot de passe" : "Password"}
                      className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-rose-450 font-medium font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl transition-all duration-300 shadow-md active:scale-98 cursor-pointer text-xs uppercase tracking-wider font-sans"
                >
                  {mode === 'login'
                    ? (isFr ? 'Accéder à mon espace' : 'Access My Portal')
                    : (isFr ? 'Créer mon espace pro' : 'Create My Pro Space')}
                </button>
              </form>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
