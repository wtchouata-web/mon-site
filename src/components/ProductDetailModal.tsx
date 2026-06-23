import React, { useState } from 'react';
import { Product, Dispute, Comment } from '../types';
import { X, MessageCircle, MapPin, Phone, MessageSquare, AlertTriangle, CheckSquare, Sparkles, Star, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onWhatsAppRedirect: (product: Product, prefilledMessage: string) => void;
  onSubmitDispute: (disputeData: Omit<Dispute, 'id' | 'createdAt'>) => void;
  comments: Comment[];
  onAddComment: (productId: string, author: string, rating: number, commentText: string) => void;
  language?: 'fr' | 'en';
}

export default function ProductDetailModal({
  product,
  onClose,
  onWhatsAppRedirect,
  onSubmitDispute,
  comments,
  onAddComment,
  language = 'fr'
}: ProductDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'comments' | 'dispute'>('info');
  const isFr = language === 'fr';

  // Prefilled WhatsApp message
  const [waMessage, setWaMessage] = useState('');

  React.useEffect(() => {
    if (isFr) {
      setWaMessage(`Bonjour ${product.sellerName}, je vous contacte depuis la plateforme Rose Amour à propos de votre fiche "${product.title}" (${product.price.toLocaleString('fr-FR')} FCFA). Es-tu disponible ?`);
    } else {
      setWaMessage(`Hello ${product.sellerName}, I am contacting you from the Rose Amour platform regarding your listing "${product.title}" (${product.price.toLocaleString('fr-FR')} FCFA). Are you available?`);
    }
  }, [language, product, isFr]);

  // Dispute form state
  const [complaintUser, setComplaintUser] = useState('');
  const [disputeReason, setDisputeReason] = useState(
    isFr ? 'Numéro WhatsApp invalide ou de harcèlement' : 'Invalid or abusive WhatsApp number'
  );
  const [disputeDetails, setDisputeDetails] = useState('');
  const [disputeSuccess, setDisputeSuccess] = useState(false);

  // Comment submission form state
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentRating, setCommentRating] = useState(5);
  const [commentText, setCommentText] = useState('');
  const [commentSuccess, setCommentSuccess] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Filter comments for this product
  const productComments = comments.filter(c => c.productId === product.id);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      maximumFractionDigits: 0
    }).format(price).replace('XAF', 'FCFA');
  };

  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintUser || !disputeDetails) return;

    onSubmitDispute({
      productId: product.id,
      productTitle: product.title,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      complaintUser,
      reason: disputeReason,
      details: disputeDetails,
      status: 'pending'
    });

    setDisputeSuccess(true);
    setTimeout(() => {
      setDisputeSuccess(false);
      setActiveTab('info');
    }, 2500);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentAuthor.trim() || !commentText.trim()) return;

    onAddComment(product.id, commentAuthor, commentRating, commentText);
    
    setCommentSuccess(true);
    setCommentAuthor('');
    setCommentText('');
    setCommentRating(5);
    
    setTimeout(() => {
      setCommentSuccess(false);
    }, 3000);
  };

  const reasonsFr = [
    'Numéro WhatsApp invalide ou harceleur',
    'Photos mensongères ou trompeuses',
    'Tarif différent de celui affiché',
    'Suspicion d\'arnaque / demande d\'acompte suspecte',
    'Comportement inapproprié',
    'Autre problème grave de service'
  ];

  const reasonsEn = [
    'Invalid or abusive WhatsApp number',
    'Deceptive or misleading photos',
    'Price is different than listing',
    'Scam suspicion / suspicious deposit request',
    'Inappropriate behavior',
    'Other serious service issue'
  ];

  const reasons = isFr ? reasonsFr : reasonsEn;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        id="detail-modal-container"
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-rose-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold text-rose-800 bg-rose-50 rounded-full border border-rose-100">
              {product.category}
            </span>
            {product.isBoosted && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-full shadow-xs">
                <Sparkles className="w-3 h-3 fill-current text-white animate-pulse" />
                <span>{isFr ? 'VIP ACCUEIL' : 'VIP HOME'}</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 px-3 text-rose-400 hover:text-rose-600 font-extrabold rounded-full hover:bg-rose-50 transition-colors duration-200 cursor-pointer text-xs uppercase"
          >
            {isFr ? 'Fermer ×' : 'Close ×'}
          </button>
        </div>

        {/* Scrollable Container Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: Product Image / Interactive 2-Image Gallery */}
            <div className="relative bg-slate-950 aspect-4/5 md:aspect-auto md:h-full min-h-[350px] flex flex-col justify-between">
              {(() => {
                const galleryImages = [product.imageUrl, product.imageUrl2].filter(Boolean) as string[];
                return (
                  <div className="relative w-full h-full flex-1 flex flex-col">
                    <img
                      src={galleryImages[activeImgIndex] || product.imageUrl}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      className="object-cover w-full h-full max-h-[550px] md:max-h-none flex-1 transition-all duration-300"
                    />
                    
                    {/* Switcher Controls if 2 images exist */}
                    {galleryImages.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 bg-slate-950/70 py-1.5 px-3 rounded-full backdrop-blur-xs">
                        {galleryImages.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveImgIndex(i)}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${
                              i === activeImgIndex ? 'bg-rose-500 scale-110' : 'bg-white/40 hover:bg-white/70'
                            }`}
                            title={`Photo ${i + 1}`}
                          />
                        ))}
                      </div>
                    )}
                    
                    {galleryImages.length > 1 && (
                      <div className="absolute top-4 left-4 z-20 bg-slate-900/80 px-2.5 py-1 rounded-xl text-[10px] text-white font-bold font-mono">
                        Photo {activeImgIndex + 1}/{galleryImages.length}
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-6 text-white md:hidden">
                      <span className="text-[11px] font-bold text-rose-300 tracking-wider uppercase">{product.location}</span>
                      <h2 className="text-xl font-extrabold font-sans mt-0.5">{product.title}</h2>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right: Text & Active Tab Section */}
            <div className="p-6 md:p-8 flex flex-col justify-between">
              {/* Custom Navigation Tab bar */}
              <div className="flex gap-1 p-1 bg-rose-50/50 rounded-2xl mb-6 border border-rose-100">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                    activeTab === 'info'
                      ? 'bg-white text-rose-700 shadow-xs border border-rose-100'
                      : 'text-slate-500 hover:text-rose-600'
                  }`}
                >
                  {isFr ? 'Détails & Contact' : 'Details & Contact'}
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                    activeTab === 'comments'
                      ? 'bg-white text-rose-700 shadow-xs border border-rose-100'
                      : 'text-slate-500 hover:text-rose-600'
                  }`}
                >
                  <span>{isFr ? 'Avis' : 'Reviews'} ({productComments.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('dispute')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                    activeTab === 'dispute'
                      ? 'bg-white text-rose-600 shadow-xs border border-rose-200'
                      : 'text-slate-500 hover:text-rose-600'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1 text-[10px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    {isFr ? 'Signaler' : 'Report'}
                  </span>
                </button>
              </div>

              {/* TAB 1: Main profile and direct contact text */}
              {activeTab === 'info' && (
                <div className="space-y-6">
                  {/* Title, details & highlights text */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-rose-600 mb-1 font-bold">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{product.location}</span>
                      {product.age && (
                        <>
                          <span className="text-rose-200">•</span>
                          <span className="px-2 py-0.5 bg-rose-50 rounded-lg text-rose-700 font-mono text-[10px]">{product.age} {isFr ? 'ans' : 'y.o.'}</span>
                        </>
                      )}
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{product.title}</h1>
                    <div className="text-2xl font-black text-rose-600 mt-2 font-mono">
                      {formatPrice(product.price)}
                    </div>
                  </div>
 
                  {/* Required User highlight status message - displayed prominently inside bubble */}
                  {product.statusText && (
                    <div className="bg-pink-50 border border-pink-100 rounded-2xl p-3.5 text-sm text-pink-900 font-semibold italic relative">
                      <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-pink-500 rounded-l-full" />
                      ★ {isFr ? 'Statut Actuel' : 'Current Status'} : "{product.statusText}"
                    </div>
                  )}
 
                  {/* Description Box */}
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{isFr ? 'Présentation' : 'About Me'}</h3>
                    <p className="text-slate-650 text-sm leading-relaxed whitespace-pre-line bg-rose-50/20 p-4.5 rounded-2xl border border-rose-100/60 font-sans font-medium">
                      {product.description}
                    </p>
                  </div>
                            {/* Seller Contacts */}
                  <div className="bg-pink-50/40 rounded-2xl p-4 border border-pink-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-[9px] text-pink-700 uppercase tracking-widest font-extrabold mb-1">{isFr ? 'Auteur de la publication' : 'Listing Publisher'}</h4>
                      <p className="font-bold text-slate-800 text-sm">{product.sellerName}</p>
                      <p className="text-xs text-slate-500 font-mono">{product.sellerWhatsapp}</p>
                    </div>
                    <div className="text-center px-3 py-1.5 bg-white border border-pink-100 rounded-xl shadow-2xs">
                      <Phone className="w-4 h-4 text-pink-600 mx-auto mb-0.5" />
                      <span className="text-[9px] font-bold text-slate-500 font-mono">{isFr ? 'Contact Direct' : 'Direct Contact'}</span>
                    </div>
                  </div>

                  {/* WhatsApp Pre-written Box */}
                  <div className="border border-pink-100 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="bg-pink-600 px-4 py-2 text-white flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-white/30 text-white flex items-center justify-center font-bold text-xs uppercase">
                        {product.sellerName.charAt(0)}
                      </div>
                      <div className="text-left leading-none">
                        <p className="text-[11px] font-bold text-white">{product.sellerName}</p>
                        <span className="text-[9px] text-pink-100 font-medium">{isFr ? "Bouton d'accroche direct" : 'Direct Intro Opener'}</span>
                      </div>
                    </div>
                    
                    <div className="bg-pink-50/30 p-3">
                      <textarea
                        value={waMessage}
                        onChange={(e) => setWaMessage(e.target.value)}
                        className="w-full bg-white border border-pink-100 focus:outline-hidden focus:ring-1 focus:ring-pink-400 p-2 text-xs rounded-xl text-slate-600 resize-none h-14"
                        placeholder={isFr ? "Écrivez votre message..." : "Write your message..."}
                      />
                    </div>

                    <div className="p-2 bg-white">
                      <button
                        onClick={() => onWhatsAppRedirect(product, waMessage)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-xl transition-all shadow-xs cursor-pointer text-xs"
                      >
                        <MessageCircle className="w-4 h-4 fill-current text-white" />
                        <span>{isFr ? 'Contacter sur WhatsApp' : 'Contact on WhatsApp'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: VISITOR COMMENTS & RATINGS */}
              {activeTab === 'comments' && (
                <div className="space-y-4 flex flex-col h-full justify-between">
                  {/* Reviews scroll section */}
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                    <h3 className="text-xs font-extrabold text-slate-700 tracking-wider uppercase mb-1">{isFr ? 'Avis laissés par les internautes' : 'User Reviews'}</h3>
                    
                    {productComments.length === 0 ? (
                      <div className="p-6 text-center bg-gray-50 rounded-2xl border border-gray-150 text-xs text-slate-400">
                        {isFr ? "Aucun commentaire n'a encore été publié pour ce profil. Laissez le premier avis !" : "No comments have been posted yet. Be the first to leave one!"}
                      </div>
                    ) : (
                      productComments.map((comment) => (
                        <div key={comment.id} className="p-3 bg-pink-50/20 border border-rose-100/40 rounded-xl">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-800">{comment.authorName}</span>
                            <div className="flex items-center text-amber-400">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${i < comment.rating ? 'fill-current text-amber-400' : 'text-slate-200'}`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-normal">{comment.content}</p>
                          <span className="block text-[8px] text-slate-400 font-mono mt-1">
                            {new Date(comment.createdAt).toLocaleDateString(isFr ? 'fr-FR' : 'en-US', {
                              day: 'numeric',
                              month: 'long',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* New comment input form */}
                  <div className="border-t border-rose-100/70 pt-4 bg-white sticky bottom-0">
                    <h4 className="text-xs font-bold text-rose-700 mb-2">{isFr ? 'Laissez votre témoignage anonyme' : 'Leave an anonymous testimonial'}</h4>
                    
                    {commentSuccess ? (
                      <div className="p-3 bg-pink-50 text-pink-800 rounded-xl text-[11px] font-bold text-center">
                        {isFr ? '✔ Votre commentaire a été publié avec succès. Merci pour votre avis !' : '✔ Your testimonial was published successfully. Thank you!'}
                      </div>
                    ) : (
                      <form onSubmit={handleCommentSubmit} className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <input
                              type="text"
                              required
                              value={commentAuthor}
                              onChange={(e) => setCommentAuthor(e.target.value)}
                              placeholder={isFr ? "Votre surnom (ex: Franck DB)" : "Nickname (e.g. Franck DB)"}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-rose-300"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-1 px-1">
                            <span className="text-[10px] text-slate-400 mr-1 font-bold">{isFr ? 'Note :' : 'Rating:'}</span>
                            {[1, 2, 3, 4, 5].map((num) => (
                              <button
                                type="button"
                                key={num}
                                onClick={() => setCommentRating(num)}
                                className="p-0.5 cursor-pointer hover:scale-110 transition-transform"
                              >
                                <Star
                                  className={`w-4 h-4 ${num <= commentRating ? 'text-amber-400 fill-current' : 'text-slate-200'}`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="relative">
                          <textarea
                            required
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder={isFr ? "Commentez votre expérience, respectez la politesse..." : "Write your experience here, please stay polite..."}
                            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-rose-300 resize-none h-12 pr-10"
                          />
                          <button
                            type="submit"
                            className="absolute right-2 bottom-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Signaler / Dispute report */}
              {activeTab === 'dispute' && (
                <div className="space-y-4">
                  {disputeSuccess ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-8 text-center bg-rose-50 rounded-2xl border border-rose-100 flex flex-col items-center"
                    >
                      <CheckSquare className="w-10 h-10 text-rose-600 mb-2" />
                      <h4 className="text-sm font-bold text-rose-900 mb-0.5">{isFr ? 'Signalement Reçu !' : 'Report Received!'}</h4>
                      <p className="text-[11px] text-rose-700">{isFr ? "L'administrateur VIP va auditer cette annonce sous peu. Merci." : "The VIP administrator will audit this listing shortly. Thank you."}</p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleDisputeSubmit} className="space-y-4">
                      {/* Safety warning referencing support, raw number hidden, replaced with button as per request */}
                      <div className="p-3 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs">
                        <p className="font-bold">{isFr ? "Aide et Support d'Urgence" : 'Emergency Support & Help'}</p>
                        <p className="leading-snug mt-0.5">
                          {isFr
                            ? "En cas de litige financier, d'abus ou de question urgente, contactez immédiatement l'assistance administrative :"
                            : 'In case of financial dispute, abuse or urgent question, contact administrative help immediately:'}
                        </p>
                        <a
                          href="tel:659228516"
                          className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          <Phone className="w-3.5 h-3.5 fill-current text-white" />
                          <span>{isFr ? 'Appeler le Support' : 'Call Support'}</span>
                        </a>
                      </div>

                      {/* Complaint name */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{isFr ? 'Votre Prénom ou Surnom' : 'Your First Name or Nickname'}</label>
                        <input
                          type="text"
                          required
                          value={complaintUser}
                          onChange={(e) => setComplaintUser(e.target.value)}
                          placeholder={isFr ? "Ex: Stéphane B." : "e.g. Steph B."}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs focus:outline-hidden focus:border-rose-400 font-medium"
                        />
                      </div>

                      {/* Motif Select */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{isFr ? 'Motif principal' : 'Main dispute reason'}</label>
                        <select
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs focus:outline-hidden focus:border-rose-400 font-medium"
                        >
                          {reasons.map((r, idx) => (
                            <option key={idx} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>

                      {/* Details text */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{isFr ? 'Explication détaillée' : 'Detailed Explanation'}</label>
                        <textarea
                          required
                          value={disputeDetails}
                          onChange={(e) => setDisputeDetails(e.target.value)}
                          placeholder={isFr ? "Dites-nous ce qui s'est passé avec ce contact afin que les modérateurs puissent intervenir." : "Tell us what happened with this contact so moderators can take action."}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs h-20 focus:outline-hidden focus:border-rose-400 font-medium resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs text-xs"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-white" />
                        <span>{isFr ? 'Dénoncer cette annonce' : 'Report this listing'}</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
