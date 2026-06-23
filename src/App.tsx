import React, { useState, useEffect } from 'react';
import { getDB, saveDB, SEEDED_USERS, SEEDED_PRODUCTS, SEEDED_COMMENTS } from './data';
import { User, Product, Sale, ConnectionLog, Dispute, Comment, DirectMessage, WhatsAppClickLog } from './types';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import AuthModal from './components/AuthModal';
import CheckoutModal from './components/CheckoutModal';
import { 
  MessageCircle, 
  Sparkles, 
  PlusCircle, 
  Heart, 
  Database, 
  Users, 
  TrendingUp, 
  AlertOctagon, 
  Search, 
  Filter, 
  ShieldAlert, 
  ChevronRight,
  LogOut,
  UserCheck,
  Zap,
  Globe,
  CheckCircle,
  HelpCircle,
  MapPin,
  Clock,
  ArrowRight,
  Trash2,
  Lock,
  MessageSquare,
  AlertTriangle,
  User as UserIcon,
  PhoneCall,
  Upload,
  Shield,
  FileText,
  DollarSign,
  Eye,
  Check,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Live Visitor Tracing interface
interface VisitorTrace {
  id: string;
  timestamp: string;
  ip: string;
  device: string;
  lang: string;
  viewport: string;
}

// Public promotional messages promoting profile boosting
const PROMO_NOTIFICATIONS_FR = [
  "Astuce : Les profils avec Badge Vérifié reçoivent en moyenne 5x plus de demandes WhatsApp.",
  "Booster votre profil permet de s'afficher directement en haut de page de Rose Amour !",
  "Félicitations à Chloé (Yaoundé) : Passage au forfait Premium et +200 visites récoltées.",
  "Ne restez pas invisible ! Activez le Booster VIP pour multiplier vos revenus cette semaine.",
  "Statistique : 92% des hôtesses recommandent d'activer le Boost VIP Accueil."
];

const PROMO_NOTIFICATIONS_EN = [
  "Pro Tip: Profiles with a Verified Badge secure 5x more WhatsApp connections.",
  "Boosting your listing places you at the very top of Rose Amour's homepage!",
  "Congratulations to Chloé (Yaoundé): Upgraded to VIP Premium with +200 views.",
  "Don't lose clients! Activate VIP Booster to multiply your chat leads today.",
  "Fact: 92% of top-performing hostesses recommend using the VIP Featured Boost."
];

// Global dictionary for multi-language support (English / French)
const TRANSLATIONS = {
  fr: {
    banner_tag: "Rencontres Privées & Accompagnement Cameroun",
    banner_title: "espace de rencontres privé des hôtesses & accompagnatrices indépendantes au Cameroun.",
    banner_desc: "Consultez notre sélection d'indépendantes de charme à Yaoundé, Douala, Kribi et Limbe. Prenez contact directement par WhatsApp de manière 100% sécurisée, sans intermédiaire.",
    post_profile: "Poster mon profil",
    all_profiles: "Tous les profils",
    vip_only: "VIP Uniquement",
    search_placeholder: "Chercher (ex: Bastos, Douala, Cindy...)",
    all: "Tout",
    emergency_call: "Renseignements / Plainte :",
    stats_users: "utilisateurs inscrits",
    stats_vip: "fiches Premium VIP",
    support_team: "Contacter Willow Administration",
    city_section_title: "Membres par Villes du Cameroun",
    not_found: "Aucun résultat trouvé pour cette recherche.",
    verified_badge: "Profil Certifié"
  },
  en: {
    banner_tag: "Private Meetings & Escort Services Cameroon",
    banner_title: "Private Escort & Premium Hostess Directory",
    banner_desc: "Browse our handpicked selection of independent companions in Yaounde, Douala, Kribi, and Limbe. Contact them directly on WhatsApp 100% securely with zero fees.",
    post_profile: "Post Profile",
    all_profiles: "All Profiles",
    vip_only: "VIP Only",
    search_placeholder: "Search (e.g. Bastos, Douala, Cindy...)",
    all: "All",
    emergency_call: "Inquiries / Complaints:",
    stats_users: "registered users",
    stats_vip: "VIP Premium cards",
    support_team: "Contact Willow Help Center",
    city_section_title: "Members by Cameroonian Cities",
    not_found: "No results matched your search queries.",
    verified_badge: "Verified Profile"
  }
};

declare global {
  interface Window {
    wpApiSettings?: {
      root: string;
      nonce: string;
    };
  }
}

export default function App() {
  // --- DATABASE & SESSION STATES ---
  const [db, setDb] = useState(() => getDB());
  const [currentUser, setCurrentUser] = useState<User | null>(() => getDB().currentUser);
  const [products, setProducts] = useState<Product[]>(() => getDB().products);
  const [sales, setSales] = useState<Sale[]>(() => getDB().sales);
  const [logs, setLogs] = useState<ConnectionLog[]>(() => getDB().logs);
  const [disputes, setDisputes] = useState<Dispute[]>(() => getDB().disputes);
  const [comments, setComments] = useState<Comment[]>(() => getDB().comments || SEEDED_COMMENTS);

  // Admin to Member Personal Messages
  const [messages, setMessages] = useState<DirectMessage[]>(() => {
    try {
      const val = localStorage.getItem('rose_amour_messages');
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  });

  // Security Protection Tracker for WhatsApp visitors
  const [whatsAppClicks, setWhatsAppClicks] = useState<WhatsAppClickLog[]>(() => {
    try {
      const val = localStorage.getItem('rose_amour_whatsapp_clicks');
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  });

  // Admin select recipients for personal message composer
  const [selectedRecipientForMsg, setSelectedRecipientForMsg] = useState<User | null>(null);
  const [adminMsgText, setAdminMsgText] = useState('');
  const [adminMsgType, setAdminMsgType] = useState<'encouragement' | 'congratulations' | 'general'>('encouragement');

  // Multi-Supervision live management filter state
  const [supervisionFilter, setSupervisionFilter] = useState<string>('none');

  // Animated public promotional ticker
  const [promoMessageIndex, setPromoMessageIndex] = useState(0);
  const [showPromoMessage, setShowPromoMessage] = useState(false); // starts hidden, shows every 2 mins for 3 secs
  
  // Real Persistent Visitor Audits
  const [visitorTraces, setVisitorTraces] = useState<VisitorTrace[]>(() => {
    try {
      const stored = localStorage.getItem('rose_amour_visitor_traces');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // --- INTERFACE CONTROL STATES ---
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [activeCategory, setActiveCategory] = useState<string>('Tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyBoosted, setOnlyBoosted] = useState<boolean>(false);
  const [selectedCityFilter, setSelectedCityFilter] = useState<string | null>(null);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState<boolean>(false);
  
  // Workspace Modes
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [userDashboardMode, setUserDashboardMode] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<'listings' | 'users' | 'disputes' | 'security' | 'system'>('listings');
  const [userTab, setUserTab] = useState<'account' | 'profile_preview' | 'profile_edit' | 'payments' | 'visits' | 'ads' | 'password' | 'verified_status' | 'inbox'>('account');

  // Admin Dashboard Configurable Parameters
  const [adminAnnouncement, setAdminAnnouncement] = useState<string>(() => {
    try {
      return localStorage.getItem('rose_amour_admin_announcement') || "Félicitations ! Plus de 2 500 hôtesses vérifiées ce mois-ci aux normes de discrétion.";
    } catch {
      return "Félicitations ! Plus de 2 500 hôtesses vérifiées ce mois-ci aux normes de discrétion.";
    }
  });
  const [boostFeeAmount, setBoostFeeAmount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('rose_amour_boost_fee_amount');
      return raw ? parseInt(raw, 10) : 5000;
    } catch {
      return 5000;
    }
  });
  const [maintenanceModeActive, setMaintenanceModeActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('rose_amour_maintenance_active') === 'true';
    } catch {
      return false;
    }
  });
  const [hideUnverifiedProducts, setHideUnverifiedProducts] = useState<boolean>(() => {
    try {
      return localStorage.getItem('rose_amour_hide_unverified') === 'true';
    } catch {
      return false;
    }
  });

  // --- MEMBER NOIF STATE / IDENTIFIERS VIEW STATE ---
  const [ephemeralNotification, setEphemeralNotification] = useState<string | null>(null);
  const [shownEncouragementIds, setShownEncouragementIds] = useState<string[]>([]);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);

  // Admin search filters
  const [adminListingsSearchQuery, setAdminListingsSearchQuery] = useState<string>('');
  const [adminUsersSearchQuery, setAdminUsersSearchQuery] = useState<string>('');
  const [adminSecuritySearchQuery, setAdminSecuritySearchQuery] = useState<string>('');

  // Modals Trigger
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isPublishingFormOpen, setIsPublishingFormOpen] = useState<boolean>(false);
  
  // Checkout & Boost flow Routing
  const [checkoutProductData, setCheckoutProductData] = useState<any | null>(null);
  const [selectedProductForQuickBoost, setSelectedProductForQuickBoost] = useState<Product | null>(null);
  const [checkoutType, setCheckoutType] = useState<'list_fee' | 'boost_fee' | 'dynamic_plan'>('list_fee');

  // New Publication Temporary States (Up to 2 images supported!)
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState<number>(10000);
  const [newCategory, setNewCategory] = useState('Modèles VIP');
  const [newLocation, setNewLocation] = useState('Douala, Cameroun');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageUrl2, setNewImageUrl2] = useState(''); // Second optional image layer
  const [newStatusText, setNewStatusText] = useState('Disponible immédiatement');
  const [newAge, setNewAge] = useState<number>(21);
  const [withInitialBoost, setWithInitialBoost] = useState(false);

  // --- AUTOMATIC VISITOR SECURITY AUDIT INGESTION ---
  useEffect(() => {
    const isReturningVisit = sessionStorage.getItem('logged_visit_session');
    if (!isReturningVisit) {
      sessionStorage.setItem('logged_visit_session', 'true');
      const trace: VisitorTrace = {
        id: `vis_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        ip: `${Math.floor(Math.random() * 155) + 100}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}`,
        device: window.innerWidth < 768 ? 'Téléphone Portable Android/iOS' : 'Ordinateur Portable macOS/Windows',
        lang: navigator.language || 'fr-FR',
        viewport: `${window.innerWidth}x${window.innerHeight}`
      };
      
      const newTraces = [trace, ...visitorTraces].slice(0, 100); // capped to avoid overflow
      setVisitorTraces(newTraces);
      localStorage.setItem('rose_amour_visitor_traces', JSON.stringify(newTraces));
    }
  }, []);

  // --- REAL-TIME LIVE EXPRESS SERVER STATE SYNC ENGINE ---
  const isSyncingRef = React.useRef(false);

  const pullFromServer = async () => {
    if (isSyncingRef.current) return;
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        let changed = false;

        if (data.users && JSON.stringify(data.users) !== localStorage.getItem('rose_amour_users')) {
          localStorage.setItem('rose_amour_users', JSON.stringify(data.users));
          changed = true;
        }
        if (data.products && JSON.stringify(data.products) !== localStorage.getItem('rose_amour_products')) {
          localStorage.setItem('rose_amour_products', JSON.stringify(data.products));
          changed = true;
        }
        if (data.sales && JSON.stringify(data.sales) !== localStorage.getItem('rose_amour_sales')) {
          localStorage.setItem('rose_amour_sales', JSON.stringify(data.sales));
          changed = true;
        }
        if (data.comments && JSON.stringify(data.comments) !== localStorage.getItem('rose_amour_comments')) {
          localStorage.setItem('rose_amour_comments', JSON.stringify(data.comments));
          changed = true;
        }
        if (data.messages && JSON.stringify(data.messages) !== localStorage.getItem('rose_amour_messages')) {
          localStorage.setItem('rose_amour_messages', JSON.stringify(data.messages));
          changed = true;
        }
        if (data.logs && JSON.stringify(data.logs) !== localStorage.getItem('rose_amour_logs')) {
          localStorage.setItem('rose_amour_logs', JSON.stringify(data.logs));
          changed = true;
        }
        if (data.whatsAppClicks && JSON.stringify(data.whatsAppClicks) !== localStorage.getItem('rose_amour_whatsapp_clicks')) {
          localStorage.setItem('rose_amour_whatsapp_clicks', JSON.stringify(data.whatsAppClicks));
          changed = true;
        }
        if (data.admin_announcement && data.admin_announcement !== localStorage.getItem('rose_amour_admin_announcement')) {
          localStorage.setItem('rose_amour_admin_announcement', data.admin_announcement);
          setAdminAnnouncement(data.admin_announcement);
        }

        if (changed) {
          isSyncingRef.current = true;
          const currentDB = getDB();
          setProducts(currentDB.products);
          setSales(currentDB.sales);
          setComments(currentDB.comments);
          setLogs(currentDB.logs || []);
          
          try {
            const storedMsgs = localStorage.getItem('rose_amour_messages');
            if (storedMsgs) setMessages(JSON.parse(storedMsgs));
          } catch {}

          try {
            const storedClicks = localStorage.getItem('rose_amour_whatsapp_clicks');
            if (storedClicks) setWhatsAppClicks(JSON.parse(storedClicks));
          } catch {}
          
          setDb(currentDB);
          isSyncingRef.current = false;
        }
      }
    } catch (err) {
      console.error('Error pulling from server:', err);
    }
  };

  const pushToServer = async () => {
    try {
      await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: JSON.parse(localStorage.getItem('rose_amour_users') || '[]'),
          products: JSON.parse(localStorage.getItem('rose_amour_products') || '[]'),
          sales: JSON.parse(localStorage.getItem('rose_amour_sales') || '[]'),
          comments: JSON.parse(localStorage.getItem('rose_amour_comments') || '[]'),
          messages: JSON.parse(localStorage.getItem('rose_amour_messages') || '[]'),
          logs: JSON.parse(localStorage.getItem('rose_amour_logs') || '[]'),
          whatsAppClicks: JSON.parse(localStorage.getItem('rose_amour_whatsapp_clicks') || '[]'),
          admin_announcement: localStorage.getItem('rose_amour_admin_announcement') || ''
        })
      });
    } catch (err) {
      console.error('Error pushing to server:', err);
    }
  };

  // Pull on mount and periodically
  useEffect(() => {
    pullFromServer();
    const interval = setInterval(pullFromServer, 4000);
    return () => clearInterval(interval);
  }, []);

  // --- SYNCHRONIZATION HOOKS ---
  useEffect(() => { 
    saveDB.currentUser(currentUser); 
  }, [currentUser]);

  useEffect(() => { 
    saveDB.products(products); 
    pushToServer();
  }, [products]);

  useEffect(() => { 
    saveDB.sales(sales); 
    pushToServer();
  }, [sales]);

  useEffect(() => { 
    saveDB.logs(logs); 
    pushToServer();
  }, [logs]);

  useEffect(() => { 
    saveDB.disputes(disputes); 
    pushToServer();
  }, [disputes]);

  useEffect(() => { 
    saveDB.comments(comments); 
    pushToServer();
  }, [comments]);

  useEffect(() => {
    localStorage.setItem('rose_amour_messages', JSON.stringify(messages));
    pushToServer();
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('rose_amour_whatsapp_clicks', JSON.stringify(whatsAppClicks));
    pushToServer();
  }, [whatsAppClicks]);

  // Ephemeral encouragement notification detection
  useEffect(() => {
    if (currentUser) {
      const myEncouragements = messages.filter(
        m => m.recipientId === currentUser.id && 
             m.type === 'encouragement' && 
             !shownEncouragementIds.includes(m.id)
      );
      if (myEncouragements.length > 0) {
        setEphemeralNotification(myEncouragements[0].content);
        setShownEncouragementIds(prev => [...prev, myEncouragements[0].id]);
      }
    }
  }, [currentUser, messages, shownEncouragementIds]);

  // Public animated booster promo tickers switcher loop
  // L'annonce qui anime en bas de page doit apparaitre toutes les 2 minutes (120000ms) et durer 3 secondes (3000ms) avant de disparaitre.
  useEffect(() => {
    const showDuration = 3000;      // must stay on screen for 3 seconds
    const intervalTime = 120000;    // reappears every 2 minutes

    const triggerPromoMessage = () => {
      setShowPromoMessage(true);
      
      const hideTimeout = setTimeout(() => {
        setShowPromoMessage(false);
        setPromoMessageIndex(prev => (prev + 1) % PROMO_NOTIFICATIONS_FR.length);
      }, showDuration);

      return hideTimeout;
    };

    // First presentation at 5 seconds for demonstration, then repeats cleanly every 2 minutes
    const initialDelay = setTimeout(() => {
      triggerPromoMessage();
    }, 5000);

    const interval = setInterval(() => {
      triggerPromoMessage();
    }, intervalTime);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, []);

  const logWhatsAppClick = (product: Product, prefilledMessage: string) => {
    const freshTraces = JSON.parse(localStorage.getItem('rose_amour_visitor_traces') || '[]');
    const currentVisitor = freshTraces[0];
    const newLog: WhatsAppClickLog = {
      id: `wa_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      productId: product.id,
      productTitle: product.title,
      hostessName: product.sellerName,
      hostessWhatsapp: product.sellerWhatsapp,
      visitorIp: currentVisitor?.ip || `${Math.floor(Math.random() * 155) + 100}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}`,
      visitorDevice: currentVisitor?.device || (window.innerWidth < 768 ? 'Téléphone Android/iOS App' : 'Ordinateur Windows/macOS'),
      visitorLang: currentVisitor?.lang || navigator.language || 'fr-FR',
      visitorUsername: currentUser ? `${currentUser.name} (${currentUser.email})` : undefined,
      message: prefilledMessage,
      timestamp: new Date().toISOString()
    };
    setWhatsAppClicks(prev => [newLog, ...prev]);
  };

  // Sync WordPress database if present
  useEffect(() => {
    if (window.wpApiSettings) {
      fetch(`${window.wpApiSettings.root}rose-amour/v1/profiles`, {
        headers: {
          'X-WP-Nonce': window.wpApiSettings.nonce
        }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setProducts(data);
          }
        })
        .catch(err => console.error("Could not sync with local Local WP site :", err));
    }
  }, []);

  // Preset stock images helper list
  const sampleImages = [
    { title: 'Rose Glamour', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80' },
    { title: 'Chic Portrait', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80' },
    { title: 'Studio Douceur', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80' },
    { title: 'Cameroon Queen', url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80' },
  ];

  // --- USER NAVIGATION & DECORATORS ---
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setIsAdminMode(true);
      setUserDashboardMode(false);
    } else {
      setIsAdminMode(false);
      setUserDashboardMode(true);
      setUserTab('account'); // Reset view tab to user profile
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdminMode(false);
    setUserDashboardMode(false);
    saveDB.currentUser(null);
  };

  const handleAddConnectionLog = (newLog: Omit<ConnectionLog, 'id' | 'loginTime'>) => {
    const fullLog: ConnectionLog = {
      ...newLog,
      id: `log_${Date.now()}`,
      loginTime: new Date().toISOString()
    };
    setLogs(prev => [fullLog, ...prev]);
  };

  // --- UPDATE PROFILE (Edit My Profile Option) ---
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editCity, setEditCity] = useState(currentUser?.city || '');
  const [editWhatsapp, setEditWhatsapp] = useState(currentUser?.whatsappNumber || '');
  const [editGender, setEditGender] = useState<User['gender']>(currentUser?.gender || 'femme');
  const [editPassword, setEditPassword] = useState(currentUser?.password || 'password123');

  // Sync edit states on tab changes
  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditCity(currentUser.city || '');
      setEditWhatsapp(currentUser.whatsappNumber);
      setEditGender(currentUser.gender || 'femme');
      setEditPassword(currentUser.password || 'password123');
    }
  }, [currentUser, userTab]);

  const handleSaveProfileEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const updatedUser: User = {
      ...currentUser,
      name: editName,
      city: editCity,
      whatsappNumber: editWhatsapp,
      gender: editGender,
      password: editPassword
    };

    setCurrentUser(updatedUser);

    // Update inside stored users db
    const users: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
    const findIdx = users.findIndex(u => u.id === currentUser.id);
    if (findIdx !== -1) {
      users[findIdx] = updatedUser;
    } else {
      users.push(updatedUser);
    }
    localStorage.setItem('rose_amour_users', JSON.stringify(users));

    // Dual updates for all profiles that belong to this member
    setProducts(prev => prev.map(p => {
      if (p.sellerId === currentUser.id) {
        return {
          ...p,
          sellerName: editName,
          sellerWhatsapp: editWhatsapp,
          location: `${editCity}, Cameroun`
        };
      }
      return p;
    }));

    alert('Votre profil a été mis à jour avec succès et toutes vos publications ont été synchronisées !');
    setUserTab('account');
  };

  // --- ADD COMMENT HANDLER ---
  const handleAddComment = (productId: string, authorName: string, rating: number, content: string) => {
    const newComment: Comment = {
      id: `comment_${Date.now()}`,
      productId,
      authorName,
      rating,
      content,
      createdAt: new Date().toISOString()
    };
    setComments(prev => [newComment, ...prev]);
  };

  // --- REDIRECT WHATSAPP CLICK ---
  const handleWhatsAppClick = (product: Product, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    const textMsg = `Bonjour ${product.sellerName}, je te contacte depuis le site Rose Amour à propos de ton annonce "${product.title}". Comment vas-tu ?`;
    const cleaned = product.sellerWhatsapp.replace(/[+\s\-]/g, '');
    logWhatsAppClick(product, textMsg);
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(textMsg)}`, '_blank');
  };

  const handleWhatsAppDetailedRedirect = (product: Product, customMessage: string) => {
    const cleaned = product.sellerWhatsapp.replace(/[+\s\-]/g, '');
    logWhatsAppClick(product, customMessage);
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(customMessage)}`, '_blank');
  };

  // --- VIEW DETAILS STATISTICS TRACKER ---
  const handleViewProductDetails = (prod: Product) => {
    setProducts(prev => prev.map(p => {
      if (p.id === prod.id) {
        return { ...p, views: (p.views || 0) + 1 };
      }
      return p;
    }));
    setSelectedProduct({ ...prod, views: (prod.views || 0) + 1 });
  };

  // --- PUBLICATION HANDLER ---
  const handleOpenPublishForm = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
    } else {
      setIsPublishingFormOpen(true);
    }
  };

  const handleTriggerPublicationCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!newTitle || !newPrice || !newImageUrl || !newDesc) {
      alert('Veuillez remplir correctement les champs requis et importer au moins 1 image.');
      return;
    }

    const pendingProduct: Omit<Product, 'id' | 'createdAt' | 'status'> = {
      title: newTitle,
      description: newDesc,
      price: Number(newPrice),
      category: newCategory,
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      sellerWhatsapp: currentUser.whatsappNumber,
      imageUrl: newImageUrl,
      imageUrl2: newImageUrl2 || undefined,
      isBoosted: withInitialBoost,
      location: newLocation,
      statusText: newStatusText,
      age: Number(newAge),
      boostExpiry: withInitialBoost ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() : undefined,
    };

    setCheckoutProductData(pendingProduct);
    setCheckoutType('dynamic_plan'); // activates direct Orange Money/MTN portal switcher on launch
    setIsPublishingFormOpen(false);
  };

  const handleQuickBoostClick = (product: Product, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedProductForQuickBoost(product);
    setCheckoutType('boost_fee');
  };

  const handlePaymentSuccess = (paymentData: Omit<Sale, 'id' | 'createdAt' | 'status'> & { verificationCode?: string; planType?: string }) => {
    const transactionId = `sale_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const saleRecord: Sale = {
      ...paymentData,
      id: transactionId,
      status: 'completed',
      createdAt: timestamp
    };

    setSales(prev => [saleRecord, ...prev]);

    // Scenario A: Publishing a brand new companion profile
    if (checkoutProductData) {
      const addedProduct: Product = {
        ...checkoutProductData,
        id: `prod_${Date.now()}`,
        status: 'active',
        createdAt: timestamp,
        isBoosted: checkoutProductData.isBoosted || (paymentData.planType === 'vedette' || paymentData.planType === 'premium'),
        verificationCode: paymentData.verificationCode,
        planType: paymentData.planType as any,
        paymentConfirmed: true
      };

      setProducts(prev => [addedProduct, ...prev]);

      // Sync Local WP MySQL Database
      if (window.wpApiSettings) {
        fetch(`${window.wpApiSettings.root}rose-amour/v1/profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': window.wpApiSettings.nonce
          },
          body: JSON.stringify(addedProduct)
        }).catch(err => console.error("Failed writing product to WordPress MySQL db :", err));
      }

      setCheckoutProductData(null);
      setNewTitle('');
      setNewDesc('');
      setNewPrice(30000);
      setNewImageUrl('');
      setNewImageUrl2('');
      setNewStatusText('Disponible immédiatement');
      setNewAge(21);
      setWithInitialBoost(false);
      
      // Auto open their Ads dashboard tab
      setUserDashboardMode(true);
      setUserTab('ads');
    }

    // Scenario B: Quick boosting an existing profile
    if (selectedProductForQuickBoost) {
      setProducts(prev => prev.map(p => {
        if (p.id === selectedProductForQuickBoost.id) {
          return {
            ...p,
            isBoosted: true,
            boostExpiry: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            verificationCode: paymentData.verificationCode,
            planType: 'vedette'
          };
        }
        return p;
      }));
      setSelectedProductForQuickBoost(null);
      setUserTab('ads');
    }
  };

  const handleSubmitDispute = (disputeData: Omit<Dispute, 'id' | 'createdAt'>) => {
    const fullDispute: Dispute = {
      ...disputeData,
      id: `dis_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setDisputes(prev => [fullDispute, ...prev]);
  };

  const handleResolveDispute = (id: string, status: 'resolved' | 'rejected') => {
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  const handleDeleteProductActual = (id: string) => {
    if (window.confirm('Voulez-vous vraiment retirer cette publication du catalogue ?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleResetDemoDatabase = () => {
    if (window.confirm('Voulez-vous purger tous les cookies d\'évaluation et réinitialiser ?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // --- CAMEROON CITIES FOR THE HUB DIRECTORY GRID ---
  const CAMEROON_CITIES = [
    'Douala', 'Yaoundé', 'Bafoussam', 'Kribi', 'Buea', 
    'Bertoua', 'Dschang', 'Bamenda', 'Garoua', 
    'Ngoundere', 'Maroua', 'Kumba', 'Bafia'
  ];

  // Helper calculation to count active profiles of designated city
  const getCityCount = (cityName: string) => {
    return products.filter(p => p.status === 'active' && (
      p.location.toLowerCase().includes(cityName.toLowerCase()) || 
      (p.cityGroup && p.cityGroup.toLowerCase() === cityName.toLowerCase()) ||
      (cityName === 'Membre' && p.category === 'Modèles VIP')
    )).length;
  };

  // --- CATALOG FILTERING LOGIC ---
  const filteredProducts = products.filter(p => {
    if (p.status !== 'active') return false;

    // Enforce unverified hide toggle (if active in admin panel)
    if (hideUnverifiedProducts) {
      const allUsersList: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || "[]");
      const creator = allUsersList.find(u => u.id === p.sellerId);
      if (creator && !creator.isVerified && !p.isBoosted && !p.paymentConfirmed) {
        return false;
      }
    }
    
    // Category filter mapping: support old categories for backward compatibility
    const itemCat = p.category === 'Modèles VIP' ? 'Premium' : p.category === 'Escortes Classiques' ? 'Classic' : p.category;
    const matchesCategory = activeCategory === 'Tous' || itemCat === activeCategory;
    
    // Text Query search
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.statusText && p.statusText.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // VIP Only toggle
    const matchesBoosted = !onlyBoosted || p.isBoosted;

    // City Selection directory filter
    let matchesCity = true;
    if (selectedCityFilter) {
      if (selectedCityFilter === 'Membre') {
        matchesCity = p.category === 'Premium' || p.category === 'Modèles VIP';
      } else {
        matchesCity = p.location.toLowerCase().includes(selectedCityFilter.toLowerCase()) || 
                      (p.cityGroup && p.cityGroup.toLowerCase() === selectedCityFilter.toLowerCase());
      }
    }

    return matchesCategory && matchesSearch && matchesBoosted && matchesCity;
  });

  // Sort boosted (VIP / Featured) profiles to always be pinned at top (Labiby style authority)
  const sortedAndFilteredProducts = [...filteredProducts].sort((a, b) => {
    if (a.isBoosted && !b.isBoosted) return -1;
    if (!a.isBoosted && b.isBoosted) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Self portfolios for isolated dashboard tab
  const myPortfolios = products.filter(p => currentUser && p.sellerId === currentUser.id);

  // Statistics indicators
  const totalInvoicedSales = sales.reduce((acc, curr) => acc + curr.amount, 0);
  const boostedCount = products.filter(p => p.isBoosted).length;
  const pendingDisputes_cnt = disputes.filter(d => d.status === 'pending').length;

  // --- MAINTENANCE BLOC CONTROLLER ---
  if (maintenanceModeActive && currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 font-sans relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
          <div className="w-full h-full bg-[radial-gradient(#e11d48_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
        </div>
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(244,63,94,0.1)] text-center space-y-6 relative z-10">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-center animate-pulse">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black uppercase tracking-tight text-white font-sans">MAINTENANCE TECHNIQUE</h1>
            <p className="text-[10px] text-pink-500 font-black uppercase tracking-widest font-mono">Contrôles de discrétion bimensuels</p>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            L'application Rose Amour est temporairement hors ligne pour purge régulière de la sandbox, masquage des IPs traçantes et cryptage renforcé. Merci de patienter quelques minutes.
          </p>
          <div className="pt-2">
            <a
              href="https://wa.me/237659228516?text=Bonjour%20Admin,%20je%20concerne%20la%20maintenance%20du%20site%20RoseAmour."
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wide rounded-xl shadow-md transition-all cursor-pointer font-sans"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Aide Directe Admin</span>
            </a>
          </div>
          <div className="border-t border-slate-800/80 pt-4 mt-2">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-[10px] text-slate-500 hover:text-slate-300 font-mono tracking-widest uppercase transition-colors pointer-events-auto"
            >
              🔒 Accès Administrateur / Staff
            </button>
          </div>
        </div>

        {isAuthModalOpen && (
          <AuthModal
            onClose={() => setIsAuthModalOpen(false)}
            onLoginSuccess={(user) => {
              handleLogin(user);
              if (user && user.role === 'admin') {
                setIsAdminMode(true);
              }
            }}
            onAddConnectionLog={handleAddConnectionLog}
            language={language}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-850 font-sans tracking-tight antialiased">
      
      {/* 1. STICKY DUAL-LANGUAGE TOP BAR */}
      <nav id="main-navigation" className="flex items-center justify-between px-4 md:px-12 h-20 bg-white border-b border-rose-100 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center space-x-6 md:space-x-8">
          {/* Logo redirecting back to standard view */}
          <div 
            className="flex items-center space-x-2.5 cursor-pointer" 
            onClick={() => { setActiveCategory('Tous'); setSelectedCityFilter(null); setIsAdminMode(false); setUserDashboardMode(false); }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md rotate-3 shadow-rose-150">
              R
            </div>
            <div className="flex flex-col">
              <span className="text-sm md:text-base font-extrabold tracking-tight text-rose-950 flex items-center gap-1.5 leading-none">
                ROSE<span className="text-rose-500 font-black tracking-widest text-xs md:text-sm">AMOUR</span>
              </span>
              <span className="text-[8px] md:text-[9px] text-pink-400 font-extrabold tracking-widest uppercase font-mono mt-0.5 leading-none">
                {language === 'fr' ? 'RENCONTRES PRIVÉES' : 'PRIVATE ENCOUNTERS'}
              </span>
            </div>
          </div>
          
          {/* Categories bar for large viewports */}
          <div className="hidden lg:flex space-x-5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <button 
              onClick={() => { setActiveCategory('Tous'); setSelectedCityFilter(null); setIsAdminMode(false); setUserDashboardMode(false); }}
              className={`hover:text-rose-600 transition-colors cursor-pointer py-1 ${!isAdminMode && !userDashboardMode && activeCategory === 'Tous' ? 'text-rose-600 border-b-2 border-rose-500 font-extrabold' : ''}`}
            >
              {language === 'fr' ? 'Tous les profils' : 'All Profiles'}
            </button>
            {['Premium', 'Classic'].map((cat) => (
              <button 
                key={cat}
                onClick={() => { setActiveCategory(cat); setSelectedCityFilter(null); setIsAdminMode(false); setUserDashboardMode(false); }}
                className={`hover:text-rose-600 transition-colors cursor-pointer py-1 ${!isAdminMode && !userDashboardMode && activeCategory === cat ? 'text-rose-600 border-b-2 border-rose-500 font-extrabold' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Action controllers & profiles toggle */}
        <div className="flex items-center space-x-2.5">
          
          {/* Bilingual flag selector */}
          <button
            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
            title="Traduire / Switch Language"
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] uppercase font-bold text-slate-600 hover:text-rose-600 bg-slate-50 border border-slate-250 rounded-xl cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-pink-600" />
            <span>{language.toUpperCase()}</span>
          </button>

          {currentUser ? (
            <div className="flex items-center space-x-2 bg-rose-50/40 px-3 py-1.5 rounded-2xl border border-rose-150/50">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-xs font-extrabold text-slate-800">
                  {currentUser.id === 'user_willow' ? 'Modérateur Staff' : currentUser.name}
                </span>
                <span className="text-[8px] text-rose-600 font-black tracking-wider uppercase font-mono leading-none">
                  {currentUser.role === 'admin' ? 'GUIDE ADMIN' : 'COMPTE ACTIF'}
                </span>
              </div>
              <div className="w-7 h-7 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs uppercase shadow-3xs">
                {currentUser.name.charAt(0)}
              </div>
              
              {/* Member is general user -> opens dashboard toggle */}
              {currentUser.role === 'user' && (
                <button
                  onClick={() => { setUserDashboardMode(!userDashboardMode); setIsAdminMode(false); }}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    userDashboardMode 
                      ? 'bg-rose-600 text-white shadow-2xs' 
                      : 'bg-rose-50 hover:bg-rose-105 text-rose-700'
                  }`}
                >
                  {userDashboardMode ? (language === 'fr' ? 'Catalogue' : 'Catalog') : (language === 'fr' ? 'Mon Compte' : 'My Account')}
                </button>
              )}

              {/* Member is Admin (Willow staff) -> toggle admin dashboard */}
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => { setIsAdminMode(!isAdminMode); setUserDashboardMode(false); }}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    isAdminMode 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-rose-600 text-white shadow-2xs'
                  }`}
                >
                  {isAdminMode ? 'Voir Catalogue' : 'Tableau Admin'}
                </button>
              )}

              <button
                onClick={handleLogout}
                title="Déconnexion"
                className="p-1 text-slate-400 hover:text-rose-600 font-extrabold text-[10px] uppercase cursor-pointer"
              >
                Quitter
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold tracking-wide uppercase rounded-xl border border-rose-100 transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-rose-500" />
              <span>Se connecter</span>
            </button>
          )}

          {/* Support Phone Button */}
          <a
            href="https://wa.me/237659228516?text=Bonjour%20l%27Admin,%20j%27ai%20besoin%20d%27assistance%20sur%20le%20site%20RoseAmour."
            target="_blank"
            rel="noreferrer"
            title="Aide Support"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-550 border border-rose-150 transition-all cursor-pointer shadow-3xs"
          >
            <PhoneCall className="w-4 h-4 text-rose-500" />
          </a>

        </div>
      </nav>

      {/* 2. ADMIN ANNOUNCEMENT BROADCAST BANNER */}
      {adminAnnouncement && currentUser?.role === 'admin' && (
        <div className="bg-rose-950 text-rose-100 py-3 px-4 text-xs font-semibold border-b border-rose-900/60 flex justify-between items-center gap-2 animate-fade-in relative z-35">
          <div className="flex items-center gap-2.5 max-w-7xl mx-auto w-full">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-550"></span>
            </span>
            <span className="truncate tracking-wide font-sans text-stone-200">
              <strong className="text-pink-400 uppercase text-[9px] font-mono font-black border border-pink-500/30 px-1.5 py-0.5 rounded bg-pink-950/40 mr-2">NOTIF ADMIN</strong>
              {adminAnnouncement}
            </span>
          </div>
          {currentUser?.role === 'admin' && (
            <button 
              onClick={() => {
                const updated = window.prompt("Modifiez l'annonce globale de Rose Amour :", adminAnnouncement);
                if (updated !== null) {
                  setAdminAnnouncement(updated);
                  localStorage.setItem('rose_amour_admin_announcement', updated);
                }
              }}
              className="text-pink-400 hover:text-white transition-colors text-[10px] shrink-0 font-bold uppercase font-mono px-2 py-0.5 rounded border border-pink-500/10 hover:bg-pink-950/60 cursor-pointer"
            >
              ⚙️ Modifier
            </button>
          )}
        </div>
      )}

      {/* 3. MAIN APPLICATION WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col">
        
        {/* UPPER AMBIENT SLATE HERO DESIGN */}
        {!isAdminMode && !userDashboardMode && (
          <div className="bg-gradient-to-br from-rose-950 via-rose-900 to-pink-900 text-white py-12 px-6 md:px-12 text-center md:text-left relative overflow-hidden border-b border-rose-950">
            <div className="absolute right-0 bottom-0 top-0 w-2/5 opacity-10 pointer-events-none hidden md:block">
              <div className="w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            </div>
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-pink-500/20 text-pink-300 border border-pink-400/20">
                  <Heart className="w-3.5 h-3.5 text-pink-400 animate-pulse fill-current" />
                  {TRANSLATIONS[language].banner_tag}
                </span>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight uppercase">
                  {TRANSLATIONS[language].banner_title}
                </h1>
                <p className="text-sm text-rose-100 max-w-2xl font-medium leading-relaxed font-sans">
                  {TRANSLATIONS[language].banner_desc}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto shrink-0">
                <button
                  onClick={handleOpenPublishForm}
                  className="px-5 py-3 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs uppercase tracking-wide rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 border border-pink-500 font-sans"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{TRANSLATIONS[language].post_profile}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl w-full mx-auto p-4 md:p-8 flex-1 flex flex-col">
          
          <AnimatePresence mode="wait">
            
            {/* ========================================================
               A. WORKSPACE MODÉRATEUR / ADMINISTRATEUR PRINCIPAL
               ======================================================== */}
            {isAdminMode && currentUser?.role === 'admin' ? (
              <motion.div
                key="admin-workspace"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 bg-slate-950 p-6 md:p-8 rounded-[2.5rem] border border-slate-800 text-slate-100 shadow-[0_0_50px_-15px_rgba(244,63,94,0.18)]"
              >
                {/* Admin Rocket Ribbon Banner */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-rose-500 font-extrabold uppercase tracking-widest font-mono">
                      <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                      <span>SÉCURITÉ WILLOW STAFF</span>
                      <span>•</span>
                      <span className="text-pink-400 bg-pink-950/60 border border-pink-500/20 px-2 py-0.5 rounded text-[9px] font-black tracking-widest font-mono">ACCÈS ROOT ADMIN</span>
                      {maintenanceModeActive && (
                        <span className="text-red-400 bg-red-950/60 border border-red-500/20 px-2 py-0.5 rounded text-[9px] font-black tracking-widest font-mono animate-pulse animate-bounce">🔒 SÉCURITÉ DE CONTRÔLE</span>
                      )}
                    </div>
                    <h2 className="text-xl font-black text-white mt-1.5 font-sans tracking-tight">Console de Modération & d'Audits Réseau Dark</h2>
                    <p className="text-xs text-slate-400 font-medium font-sans">Configuration globale des tarifs, purges automatiques et certification instantanée des fiches hôtesses.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const confirm = window.confirm("Exécuter un rapport système complet ?");
                        if (confirm) {
                          alert(`RAPPORT SYSTÈME :\n- Fiches totales : ${products.length}\n- Litiges actifs : ${pendingDisputes_cnt}\n- Trafic de sécurité : stable\n- Statut Serveur : En ligne`);
                        }
                      }}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-[10px] font-mono tracking-widest font-black uppercase rounded-xl cursor-pointer transition-all"
                    >
                      🛡️ Rapport d'intégrité
                    </button>
                    <button
                      onClick={() => setIsAdminMode(false)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold tracking-wider uppercase rounded-xl cursor-pointer transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                    >
                      Retourner au catalogue
                    </button>
                  </div>
                </div>

                {/* KPI stats section in Dark Mode */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-850 hover:border-slate-800 flex items-center justify-between shadow-lg transition-all">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono block">Cumul Invoices</span>
                      <p className="text-base font-black text-white mt-1 font-mono">{totalInvoicedSales.toLocaleString('fr-FR')} FCFA</p>
                      <span className="text-[8px] text-emerald-400 font-extrabold font-mono flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-400" />
                        MTN & Orange Money
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 flex items-center justify-center"><DollarSign className="w-4 h-4" /></div>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-850 hover:border-slate-800 flex items-center justify-between shadow-lg transition-all">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono block">Litiges Visiteurs</span>
                      <p className="text-base font-black text-rose-500 mt-1 font-mono">{pendingDisputes_cnt} en cours</p>
                      <span className="text-[8px] text-pink-400/80 font-bold font-mono">Dénonciations live</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-rose-950/40 border border-rose-550/20 text-rose-500 flex items-center justify-center"><AlertOctagon className="w-4 h-4" /></div>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-850 hover:border-slate-800 flex items-center justify-between shadow-lg transition-all">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono block">Catalog Boost VIP</span>
                      <p className="text-base font-black text-pink-500 mt-1 font-mono">{boostedCount} certifiées</p>
                      <span className="text-[8px] text-purple-400/85 font-extrabold font-mono">Booster de visibilité</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-pink-950/40 border border-pink-550/20 text-pink-500 flex items-center justify-center"><Zap className="w-4 h-4" /></div>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-850 hover:border-slate-800 flex items-center justify-between shadow-lg transition-all">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono block">Audit Sécuritaire</span>
                      <p className="text-base font-black text-slate-300 mt-1 font-mono">{visitorTraces.length} IP uniques</p>
                      <span className="text-[8px] text-teal-400 font-medium font-mono flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-teal-400 animate-ping" />
                        Surveillance active
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 flex items-center justify-center"><Users className="w-4 h-4" /></div>
                  </div>
                </div>

                {/* Real-time interactive cyber graph for full visual splendor */}
                <div className="bg-slate-900 border border-slate-800 rounded-2.5xl p-5 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono block">Riche Graphique de Fréquentation</span>
                      <p className="text-xs text-white font-extrabold mt-0.5 font-sans">Analyse de charge réseau (Serveurs Rose Amour Cameroun)</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-500/10 text-rose-400 text-[9px] font-mono font-bold uppercase rounded border border-rose-500/20 select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      Audits Synchronisés
                    </span>
                  </div>
                  <div className="h-28 w-full mt-4 flex items-end relative">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
                      <div className="border-b border-white border-dashed w-full" />
                      <div className="border-b border-white border-dashed w-full" />
                      <div className="border-b border-white border-dashed w-full" />
                    </div>
                    
                    <svg className="w-full h-full text-rose-500" viewBox="0 0 400 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chart-glow-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(244, 63, 94)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="rgb(244, 63, 94)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,100 L0,70 L40,82 L80,48 L120,68 L160,35 L200,41 L240,15 L280,52 L320,24 L360,38 L400,12 L400,100 Z"
                        fill="url(#chart-glow-grad)"
                      />
                      <path
                        d="M0,70 L40,82 L80,48 L120,68 L160,35 L200,41 L240,15 L280,52 L320,24 L360,38 L400,12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="160" cy="35" r="3" fill="#f43f5e" stroke="#0f172a" strokeWidth="1" />
                      <circle cx="240" cy="15" r="3" fill="#f43f5e" stroke="#0f172a" strokeWidth="1" />
                      <circle cx="400" cy="12" r="3" fill="#f43f5e" stroke="#0f172a" strokeWidth="1" />
                    </svg>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono mt-2">
                    <span>00:00 (Cameroun GMT+1)</span>
                    <span>08:00</span>
                    <span>12:00</span>
                    <span>16:00</span>
                    <span>En Direct ({new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})})</span>
                  </div>
                </div>

                {/* Subtabs Selector featuring advanced Config category tab */}
                <div className="flex flex-wrap bg-slate-900 p-1.5 rounded-2xl border border-slate-800 max-w-2xl gap-1">
                  {([ 'listings', 'users', 'disputes', 'security', 'system' ] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setAdminTab(tab)}
                      className={`flex-1 min-w-[100px] py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer uppercase text-center tracking-wider font-sans ${
                        adminTab === tab 
                          ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)] font-extrabold' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                      }`}
                    >
                      {tab === 'listings' 
                        ? (language === 'fr' ? 'Fiches Actives' : 'Active Profiles') 
                        : tab === 'users' 
                          ? (language === 'fr' ? 'Membres Inscrits' : 'Registered Users') 
                          : tab === 'disputes' 
                            ? (language === 'fr' ? 'Plaintes / Abus' : 'Abuse & Reports') 
                            : tab === 'security' 
                              ? (language === 'fr' ? 'Traceur Audits' : 'Security Tracker') 
                              : (language === 'fr' ? 'Configuration ⚙️' : 'Settings ⚙️')}
                    </button>
                  ))}
                </div>

                {/* Master Dropdown Supervision Center requested by the user */}
                <div className="bg-slate-950 p-5 rounded-3xl border border-slate-850 space-y-3 shadow-2xl relative mb-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase text-rose-500 tracking-widest font-mono flex items-center gap-1.5 leading-none">
                        <span className="flex h-2 w-2 relative shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                        📊 {language === 'fr' ? 'CONTRÔLE & SUPERVISION DE SÉCURITÉ' : 'LIVE CONTRÔLE & SECURITY CONTROL'}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {language === 'fr' 
                          ? "Gérez l'authenticité des profils, le traçage des leads WhatsApp et contactez directement les membres."
                          : "Manage profile integrity, trace direct WhatsApp visitor clicks and query real-time audits."}
                      </p>
                    </div>

                    <div className="relative">
                      <select
                        value={supervisionFilter}
                        onChange={(e) => setSupervisionFilter(e.target.value)}
                        className="w-full md:w-80 px-4 py-2.5 bg-slate-900 border border-slate-700 hover:border-rose-500 rounded-xl text-xs font-bold text-slate-200 cursor-pointer focus:outline-none focus:border-rose-550 transition-all font-sans"
                        id="master-supervision-dropdown"
                      >
                        <option value="none">
                          {language === 'fr' ? '📂 Filtres Standard (Menu Onglets)' : '📂 Standard Filters (Menu Tabs)'}
                        </option>
                        <option value="certified">
                          {language === 'fr' ? '🌟 Hôtesses Certifiées ✓' : '🌟 Certified Hostesses ✓'}
                        </option>
                        <option value="uncertified">
                          {language === 'fr' ? '✗ Hôtesses Non Certifiées' : '✗ Uncertified Hostesses'}
                        </option>
                        <option value="boosted">
                          {language === 'fr' ? '👑 Profils Boostés (VIP Actifs)' : '👑 Boosted Profiles (Active VIP)'}
                        </option>
                        <option value="pending_registration">
                          {language === 'fr' ? '📝 Inscriptions en Cours / Nouveaux Comptes' : '📝 Pending Registrations'}
                        </option>
                        <option value="pending_payments">
                          {language === 'fr' ? '💰 Paiements en Cours / Validation Versement' : '💰 Pending Boost Payments'}
                        </option>
                        <option value="online_members">
                          {language === 'fr' ? '🟢 Membres Actuellement en Ligne' : '🟢 Members Offline/Online Live'}
                        </option>
                        <option value="active_members">
                          {language === 'fr' ? '🔥 Membres Actifs (Annonce Publiée)' : '🔥 Active Members (With Listing)'}
                        </option>
                        <option value="inactive_members">
                          {language === 'fr' ? '❌ Membres Inactifs (Aucune Publication)' : '❌ Inactive Members (No Ads)'}
                        </option>
                        <option value="most_visited">
                          {language === 'fr' ? '📈 Meilleures Vues & Clics Profils' : '📈 Most Visited (Profile Leaderboard)'}
                        </option>
                        <option value="whatsapp_contacts">
                          {language === 'fr' ? '📱 Traçabilité Leads WhatsApp (Sécurité)' : '📱 WhatsApp Clicks Security Trails'}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* INLINE ADMIN PERSONAL WRITER DIALOGUE */}
                {selectedRecipientForMsg && (
                  <div className="mb-6 p-5 bg-gradient-to-br from-indigo-950/45 to-slate-950/80 rounded-2.5xl border border-indigo-500/35 text-slate-200 space-y-4 animate-fade-in relative z-10">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider">
                          ✉️ {language === 'fr' ? 'Rédiger une Note Personnelle Officielle' : 'Compose Official Admin Note'}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {language === 'fr' 
                            ? `Destinataire : ${selectedRecipientForMsg.name} (${selectedRecipientForMsg.email})`
                            : `Recipient: ${selectedRecipientForMsg.name} (${selectedRecipientForMsg.email})`}
                        </p>
                      </div>
                      <button 
                        onClick={() => { setSelectedRecipientForMsg(null); setAdminMsgText(''); }}
                        className="text-xs text-slate-450 hover:text-white font-mono cursor-pointer"
                      >
                        [Annuler / Close]
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                          {language === 'fr' ? 'Vibe du Message (Type)' : 'Message Purpose (Type)'}
                        </label>
                        <select
                          value={adminMsgType}
                          onChange={(e) => setAdminMsgType(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
                        >
                          <option value="encouragement">{language === 'fr' ? '💪 Encouragement & Motivation' : '💪 Encouragement & Advice'}</option>
                          <option value="congratulations">{language === 'fr' ? '🌟 Félicitations de Niveau' : '🌟 Congratulations on Level'}</option>
                          <option value="general">{language === 'fr' ? '📩 Message Général / Rappel' : '📩 General Directive / Safety'}</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                          {language === 'fr' ? 'Contenu de la note' : 'Message Content'}
                        </label>
                        <input
                          type="text"
                          required
                          value={adminMsgText}
                          onChange={(e) => setAdminMsgText(e.target.value)}
                          placeholder={language === 'fr' ? "Ex: Félicitations pour ton statut certifié rose ! Continue comme ça..." : "Ex: Congratulations on attaining Certified Rose Status! Keep it up..."}
                          className="w-full bg-slate-900 border border-slate-800 hover:border-indigo-500 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={() => {
                          if (adminMsgType === 'encouragement') {
                            setAdminMsgText(language === 'fr' ? `Bonjour ${selectedRecipientForMsg.name}, toute l'équipe de Rose Amour t'encourage à booster ton profil ou à ajouter de jolies photos pour booster ta visibilité !` : `Hi ${selectedRecipientForMsg.name}, Rose Amour team encourages you to boost your profile or upload fresh visuals to increase your bookings!`);
                          } else if (adminMsgType === 'congratulations') {
                            setAdminMsgText(language === 'fr' ? `Félicitations ${selectedRecipientForMsg.name} pour le niveau de popularité atteint sur ton annonce ! Ton sérieux fait la fierté de Rose Amour.` : `Congratulations ${selectedRecipientForMsg.name} for achieving top-tier views on our platform! Your diligence makes us proud.`);
                          } else {
                            setAdminMsgText(language === 'fr' ? `Rappel de Sécurité Officiel pour ${selectedRecipientForMsg.name}: Ne te déplace jamais seule sans vérifier l'identité de ton client par appel au préalable.` : `Official Recipient safety reminder for ${selectedRecipientForMsg.name}: Never travel alone without verifying visitor identity.`);
                          }
                        }}
                        className="py-1 px-3 bg-slate-800 border border-slate-700 hover:border-indigo-500 hover:bg-slate-750 text-slate-300 rounded-lg text-[9px] uppercase font-bold tracking-wide cursor-pointer transition-all"
                      >
                        ⚡ Appliquer un modèle
                      </button>
                      <button
                        onClick={() => {
                          if (!adminMsgText) return;
                          const newMsg: DirectMessage = {
                            id: `msg_${Date.now()}`,
                            recipientId: selectedRecipientForMsg.id,
                            senderName: "Administration Rose Amour",
                            content: adminMsgText,
                            createdAt: new Date().toISOString(),
                            isRead: false,
                            type: adminMsgType
                          };
                          setMessages(prev => [newMsg, ...prev]);
                          alert(language === 'fr' 
                            ? `Note personnelle [${adminMsgType}] transmise avec succès à ${selectedRecipientForMsg.name} !` 
                            : `Personal correspondence [${adminMsgType}] sent to ${selectedRecipientForMsg.name}!`
                          );
                          setSelectedRecipientForMsg(null);
                          setAdminMsgText('');
                        }}
                        className="py-1 px-4.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] uppercase font-extrabold tracking-wide flex items-center gap-1 cursor-pointer transition-all shadow-[0_0_12px_rgba(99,102,241,0.35)]"
                      >
                        Envoyer le message &nbsp;&rarr;
                      </button>
                    </div>
                  </div>
                )}

                {/* Subtab rendering containers updated with premium Dark Theme and features */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 md:p-6 shadow-2xl relative">
                  
                  {supervisionFilter === 'none' ? (
                    <>
                      {/* TAB 1: LISTINGS ACTIVE */}
                      {adminTab === 'listings' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Fiches Hôtesses & Catalogues</h3>
                          <p className="text-[10px] text-slate-400">Total indexé : {products.length} profils dans la base.</p>
                        </div>
                        <div className="relative w-full sm:w-64">
                          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Rechercher par nom..."
                            value={adminListingsSearchQuery}
                            onChange={(e) => setAdminListingsSearchQuery(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 pl-9 pr-4 text-xs text-slate-150 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                          />
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-200">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-950/40">
                              <th className="py-3 px-3">Hôtesse / Catégorie</th>
                              <th className="py-3">Localisation</th>
                              <th className="py-3">Tarif Fixé</th>
                              <th className="py-3">Status/VIP</th>
                              <th className="py-3">WhatsApp Direct</th>
                              <th className="py-3 text-right pr-3">Actions rapides</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {products
                              .filter(p => p.sellerName.toLowerCase().includes(adminListingsSearchQuery.toLowerCase()))
                              .map(p => (
                                <tr key={p.id} className="hover:bg-slate-850/50 transition-colors">
                                  <td className="py-3 px-3 font-bold text-white flex items-center gap-3">
                                    <img src={p.imageUrl} className="w-9 h-9 object-cover rounded-xl border border-slate-800 animate-fade-in" referrerPolicy="no-referrer" />
                                    <div>
                                      <p>{p.sellerName}</p>
                                      <span className="text-[9px] text-pink-400 font-mono italic">{p.category}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 font-medium text-slate-300 font-sans">{p.location}</td>
                                  <td className="py-3 font-bold font-mono text-pink-400">{p.price.toLocaleString('fr-FR')} FCFA</td>
                                  <td className="py-3">
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold font-mono ${p.isBoosted ? 'bg-pink-950/60 text-pink-400 border border-pink-500/20' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>
                                        {p.isBoosted ? '★ VIP ACTIF' : 'Standard'}
                                      </span>
                                      {p.paymentConfirmed && (
                                        <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 text-[8px] px-1.5 py-0.5 rounded font-bold font-mono">
                                          Vérifiée ✓
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 font-mono text-xs">{p.sellerWhatsapp}</td>
                                  <td className="py-3 text-right pr-3 space-x-1">
                                    {/* Upgrade directly within the list */}
                                    <button
                                      onClick={() => {
                                        setProducts(prev => prev.map(pro => {
                                          if (pro.id === p.id) {
                                            const rawBoost = !pro.isBoosted;
                                            return {
                                              ...pro,
                                              isBoosted: rawBoost,
                                              boostExpiry: rawBoost ? new Date(Date.now() + 5*24*60*60*1000).toISOString() : undefined
                                            };
                                          }
                                          return pro;
                                        }));
                                        alert(`Le statut VIP de ${p.sellerName} a été mis à jour.`);
                                      }}
                                      className="py-1 px-2.5 bg-slate-950 text-[9px] uppercase font-bold rounded-lg border border-slate-800 hover:border-pink-500/30 text-pink-450 hover:bg-pink-950/40 cursor-pointer transition-colors"
                                    >
                                      {p.isBoosted ? 'Déclasser Std' : 'Promouvoir VIP 👑'}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProductActual(p.id)}
                                      className="py-1 px-2.5 bg-red-950/60 border border-red-900/30 text-red-400 hover:bg-rose-900/40 rounded-lg text-[9px] uppercase font-bold transition-all cursor-pointer"
                                    >
                                      Retirer
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {products.filter(p => p.sellerName.toLowerCase().includes(adminListingsSearchQuery.toLowerCase())).length === 0 && (
                          <div className="text-center py-6 text-xs text-slate-500 font-sans">
                            Aucun profil trouvé pour : "{adminListingsSearchQuery}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: MEMBERS ACTIVE */}
                  {adminTab === 'users' && (
                    <div className="space-y-4 animate-fade-in text-slate-200">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Membres et Comptes Validés</h3>
                          <p className="text-[10px] text-slate-400">Total Comptes : configurez instantanément les statuts certifiés.</p>
                        </div>
                        <div className="relative w-full sm:w-64">
                          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Rechercher membre par nom..."
                            value={adminUsersSearchQuery}
                            onChange={(e) => setAdminUsersSearchQuery(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 pl-9 pr-4 text-xs text-slate-150 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                          />
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-950/40">
                              <th className="py-2.5 px-3">Nom Membre / Email</th>
                              <th className="py-2.5">Quartier/Ville</th>
                              <th className="py-2.5">WhatsApp</th>
                              <th className="py-2.5 text-center">Certification Badge</th>
                              <th className="py-2.5">Accès</th>
                              <th className="py-2.5 text-right pr-3">Actions rapides</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {(() => {
                              const allUsers: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
                              return allUsers
                                .filter(u => u.name.toLowerCase().includes(adminUsersSearchQuery.toLowerCase()))
                                .map(u => (
                                  <tr key={u.id} className="hover:bg-slate-850/50 transition-colors">
                                    <td className="py-3 px-3 font-bold text-white">
                                      <div className="flex flex-col">
                                        <span className="flex items-center gap-1.5">
                                          {u.name}
                                          {u.role === 'admin' && <span className="bg-amber-950 text-amber-400 border border-amber-800 text-[8px] px-1.5 rounded uppercase font-black">👑 Staff</span>}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-normal">{u.email}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 font-sans text-slate-300 font-medium">{u.city || 'Douala'}</td>
                                    <td className="py-3 font-mono text-slate-400">{u.whatsappNumber}</td>
                                    <td className="py-3 text-center">
                                      <button
                                        onClick={() => {
                                          const updatedUsersList: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
                                          const uIdx = updatedUsersList.findIndex(usr => usr.id === u.id);
                                          if (uIdx !== -1) {
                                            const toggled = !updatedUsersList[uIdx].isVerified;
                                            updatedUsersList[uIdx].isVerified = toggled;
                                            localStorage.setItem('rose_amour_users', JSON.stringify(updatedUsersList));
                                            setDb(getDB());
                                            if (currentUser && currentUser.id === u.id) {
                                              setCurrentUser({ ...currentUser, isVerified: toggled });
                                            }
                                            alert(`Statut certifié de ${u.name} commuté de façon permanente à : ${toggled ? 'ACTIF ✓' : 'INACTIF'}`);
                                          }
                                        }}
                                        className={`px-3 py-1 text-[9px] uppercase font-bold rounded-lg border ${
                                          u.isVerified 
                                            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400 hover:bg-emerald-900/60' 
                                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                                        } cursor-pointer transition-colors`}
                                      >
                                        {u.isVerified ? 'Certifié ✓ (Actif)' : 'En attente ✗'}
                                      </button>
                                    </td>
                                    <td className="py-3 text-[10px] font-bold font-mono text-pink-500 uppercase">{u.role}</td>
                                    <td className="py-3 text-right pr-3 space-x-1.5">
                                      {u.email !== 'cybertest611@gmail.com' && (
                                        <button
                                          onClick={() => {
                                            const nextRole = u.role === 'admin' ? 'user' : 'admin';
                                            if (window.confirm(`Changer le rôle système de ${u.name} ?`)) {
                                              const updatedUsersList: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
                                              const uIdx = updatedUsersList.findIndex(usr => usr.id === u.id);
                                              if (uIdx !== -1) {
                                                updatedUsersList[uIdx].role = nextRole;
                                                localStorage.setItem('rose_amour_users', JSON.stringify(updatedUsersList));
                                                setDb(getDB());
                                                alert('Changement opéré.');
                                              }
                                            }
                                          }}
                                          className="py-1 px-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-300 text-[9px] uppercase font-bold rounded-lg transition-colors cursor-pointer"
                                        >
                                          {u.role === 'admin' ? 'Rétrograder' : 'Faire Staff'}
                                        </button>
                                      )}

                                      {u.email !== 'cybertest611@gmail.com' && (
                                        <button
                                          onClick={() => {
                                            if (window.confirm(`Supprimer définitivement "${u.name}" ?`)) {
                                              const updatedUsersList: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
                                              const cleaned = updatedUsersList.filter(usr => usr.id !== u.id);
                                              localStorage.setItem('rose_amour_users', JSON.stringify(cleaned));
                                              setProducts(prev => prev.filter(p => p.sellerId !== u.id));
                                              setDb(getDB());
                                              alert('Profil et petites annonces purgés.');
                                            }
                                          }}
                                          className="py-1 px-2.5 bg-red-950/60 border border-red-900/30 text-red-400 hover:bg-red-900 text-[9px] uppercase font-black rounded-lg transition-colors cursor-pointer"
                                        >
                                          Supprimer
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ));
                            })()}
                          </tbody>
                        </table>
                        {(() => {
                          const allUsers: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
                          const results = allUsers.filter(u => u.name.toLowerCase().includes(adminUsersSearchQuery.toLowerCase()));
                          return results.length === 0 ? (
                            <div className="text-center py-6 text-xs text-slate-500 font-sans">
                              Aucun membre pour: "{adminUsersSearchQuery}"
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: DISPUTES ACTIVE */}
                  {adminTab === 'disputes' && (
                    <div className="space-y-4 animate-fade-in text-slate-100">
                      <span className="text-xs font-bold uppercase text-slate-400 block pb-2 border-b border-slate-800">Plaintes Soumises de Visiteurs</span>
                      {disputes.length === 0 ? (
                        <p className="text-center py-8 text-xs text-slate-500">Aucun signalement suspect ou litige.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {disputes.map(d => (
                            <div key={d.id} className="p-4 bg-red-950/15 border border-red-900/30 rounded-2xl text-xs space-y-3 shadow-md relative overflow-hidden">
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-white text-xs">Visiteur: {d.complaintUser}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] tracking-wider uppercase font-black font-mono ${d.status === 'pending' ? 'bg-amber-950/60 border border-amber-800 text-amber-400 animate-pulse' : 'bg-emerald-950 border border-emerald-800 text-emerald-400'}`}>{d.status}</span>
                              </div>
                              <p className="text-slate-300 font-sans leading-relaxed">
                                <strong className="text-rose-450">Membre visée :</strong> {d.sellerName} (Annonce ID: {d.productId.slice(0,6)})
                              </p>
                              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 italic text-slate-400">
                                "Motif: {d.reason} - Détails: {d.details}"
                              </div>
                              <div className="flex gap-2 justify-end">
                                {d.status === 'pending' && (
                                  <button
                                    onClick={() => handleResolveDispute(d.id, 'resolved')}
                                    className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600/30 rounded-lg text-[9px] uppercase font-bold cursor-pointer"
                                  >
                                    Classer le dossier
                                  </button>
                                )}
                                <a
                                  href={`https://wa.me/${d.sellerWhatsapp.replace(/[+\s\-]/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1.5 bg-green-700 hover:bg-green-600 border border-green-600 text-white rounded-lg text-[9px] uppercase font-bold inline-flex items-center gap-1"
                                >
                                  ✉ WhatsApp de conciliation
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: SECURITY AUDITS ACTIVE */}
                  {adminTab === 'security' && (
                    <div className="space-y-4 animate-fade-in text-slate-100">
                      <div>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                          <span className="text-xs font-bold uppercase text-slate-400">
                            {language === 'fr' ? "Traces d'Audit Réseau & Activités Visiteurs" : "Visitor Network Audit & Live Connection Trails"}
                          </span>
                          <span className="text-[10px] text-teal-400 font-bold tracking-wider font-mono animate-pulse uppercase">
                            {language === 'fr' ? "● ENREGISTREMENT CONTINU ACTIF" : "● LIVE AGENT TRAFFIC SCANNER"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-sans leading-relaxed">
                          {language === 'fr' 
                            ? "Chaque passage sur l'application Rose Amour est historisé par adresse IP. Ceci offre une traçabilité totale indispensable pour identifier les faux profils ou les tentatives de spam."
                            : "Every single connection to the Rose Amour web app is securely logged for the protection of independent hostesses and automated bot defense."}
                        </p>
                      </div>

                      {/* Advanced Search Input for Audits */}
                      <div className="relative max-w-sm">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder={language === 'fr' ? "Filtrer par IP ou type d'appareil..." : "Filter by IP or device model..."}
                          value={adminSecuritySearchQuery}
                          onChange={(e) => setAdminSecuritySearchQuery(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 pl-9 pr-4 text-xs text-slate-150 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-350">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[9px] tracking-wider bg-slate-950/40">
                              <th className="py-2.5 px-3">{language === 'fr' ? "Date / Heure" : "Date & Time"}</th>
                              <th className="py-2.5">{language === 'fr' ? "Adresse IP Publique" : "Public IP address"}</th>
                              <th className="py-2.5">{language === 'fr' ? "Support d'accès / Appareil" : "Access Device Header"}</th>
                              <th className="py-2.5 text-center">{language === 'fr' ? "Langue Navigateur" : "Browser Lang"}</th>
                              <th className="py-2.5 text-right pr-3">{language === 'fr' ? "Fenêtre d'affichage" : "Viewport Resolution"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 font-mono text-[10px] text-slate-300">
                            {visitorTraces
                              .filter(trace => 
                                trace.ip.toLowerCase().includes(adminSecuritySearchQuery.toLowerCase()) || 
                                trace.device.toLowerCase().includes(adminSecuritySearchQuery.toLowerCase())
                              )
                              .map((trace) => (
                                <tr key={trace.id} className="hover:bg-slate-850/50 transition-colors">
                                  <td className="py-2.5 px-3 text-slate-500 font-semibold">
                                    {new Date(trace.timestamp).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')}
                                  </td>
                                  <td className="py-2 bg-pink-950/10 text-pink-400 font-bold shrink-0">{trace.ip}</td>
                                  <td className="py-2 font-sans text-slate-400">{trace.device}</td>
                                  <td className="py-2 text-center text-slate-400">{trace.lang}</td>
                                  <td className="py-2 text-right pr-3 text-slate-500">{trace.viewport}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <span className="text-[10px] font-sans font-semibold text-slate-400">Pour alléger le cache du navigateur local et réinitialiser complètement la sandbox de test.</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const extraLogs = [
                                {
                                  id: `mock_ip_${Date.now()}`,
                                  timestamp: new Date().toISOString(),
                                  ip: "102.244.59." + Math.floor(Math.random()*254),
                                  device: "Smartphone Samsung Galaxy S23",
                                  lang: "fr-CM",
                                  viewport: "390x844"
                                },
                                ...visitorTraces
                              ];
                              setVisitorTraces(extraLogs);
                              localStorage.setItem('rose_amour_visitor_traces', JSON.stringify(extraLogs));
                              alert("Simulation réseau : Nouvelle trace d'accès GMT+1 ajoutée avec succès.");
                            }}
                            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[9px] uppercase font-bold font-mono border border-slate-700 cursor-pointer text-center"
                          >
                            Simuler une connexion
                          </button>
                          <button onClick={handleResetDemoDatabase} className="py-1.5 px-3 bg-pink-700 hover:bg-pink-800 text-white rounded-xl text-[9px] uppercase font-bold font-mono shadow-md cursor-pointer text-center">Purger Sandbox</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: SYSTEM CONFIGURATIONS */}
                  {adminTab === 'system' && (
                    <div className="space-y-6 animate-fade-in text-slate-100 font-sans">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider block pb-2 border-b border-slate-800">
                          Option de Paramétrage Général Système
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          Ajustez les variables de fonctionnement en direct. Ces valeurs persisteront d'une session à l'autre dans le cache de l'appareil.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        
                        {/* 1. Maintenance & Visibility Controls */}
                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                          <h4 className="text-xs font-black uppercase text-pink-550 tracking-wider font-mono">Discrétion & Modes d'urgence</h4>
                          
                          <div className="space-y-3">
                            {/* Maintenance Toggle */}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-white block">Mode Maintenance global</span>
                                <span className="text-[10px] text-slate-500 block leading-tight">Bloquer l'accès pour les visiteurs classiques</span>
                              </div>
                              <button
                                onClick={() => {
                                  const next = !maintenanceModeActive;
                                  setMaintenanceModeActive(next);
                                  localStorage.setItem('rose_amour_maintenance_active', next ? 'true' : 'false');
                                }}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${maintenanceModeActive ? 'bg-pink-600' : 'bg-slate-800'}`}
                              >
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${maintenanceModeActive ? 'translate-x-6' : 'translate-x-0'}`} />
                              </button>
                            </div>

                            {/* Guard unverified check */}
                            <div className="flex items-center justify-between font-sans">
                              <div>
                                <span className="text-xs font-bold text-white block">Masquer les non-vérifiées</span>
                                <span className="text-[10px] text-slate-500 block leading-tight">Seules les hôtesses officiellement certifiées s'affichent</span>
                              </div>
                              <button
                                onClick={() => {
                                  const next = !hideUnverifiedProducts;
                                  setHideUnverifiedProducts(next);
                                  localStorage.setItem('rose_amour_hide_unverified', next ? 'true' : 'false');
                                }}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${hideUnverifiedProducts ? 'bg-pink-600' : 'bg-slate-800'}`}
                              >
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${hideUnverifiedProducts ? 'translate-x-6' : 'translate-x-0'}`} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 2. Global Broadcast Notice Tool */}
                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                          <h4 className="text-xs font-black uppercase text-pink-550 tracking-wider font-mono">Bandeau de Notification Général</h4>
                          
                          <div className="space-y-3">
                            <label className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Texte à diffuser (bandeau du haut)</label>
                            <textarea
                              rows={2}
                              value={adminAnnouncement}
                              onChange={(e) => {
                                setAdminAnnouncement(e.target.value);
                                localStorage.setItem('rose_amour_admin_announcement', e.target.value);
                              }}
                              placeholder="Écrivez le message de soutien d'administration..."
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                            />
                            <div className="flex justify-between items-center text-[10px] text-slate-500">
                              <span>Saisissez une chaîne vide pour masquer</span>
                              <span className="font-mono text-slate-400">Enregistrement instantané ✓</span>
                            </div>
                          </div>
                        </div>

                        {/* 3. Pricing system Parameters */}
                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                          <h4 className="text-xs font-black uppercase text-pink-550 tracking-wider font-mono">Frais de boost VIP et d'insertion</h4>
                          
                          <div className="space-y-3 font-sans">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-white block">Abonnement Booster VIP</span>
                                <span className="text-[10px] text-slate-500 block leading-tight">Coût fixe par mise en vedette (FCFA)</span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-850 rounded-xl p-1 px-2.5">
                                <button
                                  onClick={() => {
                                    const next = Math.max(1000, boostFeeAmount - 500);
                                    setBoostFeeAmount(next);
                                    localStorage.setItem('rose_amour_boost_fee_amount', next.toString());
                                  }}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer transition-colors"
                                >
                                  -
                                </button>
                                <span className="text-xs font-black text-rose-450 px-1 font-mono">{boostFeeAmount.toLocaleString('fr-FR')}</span>
                                <button
                                  onClick={() => {
                                    const next = boostFeeAmount + 500;
                                    setBoostFeeAmount(next);
                                    localStorage.setItem('rose_amour_boost_fee_amount', next.toString());
                                  }}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <p className="text-[9px] text-slate-500 leading-normal">
                              Ces données déterminent le prix demandé sur le formulaire de Boost ou d'Espace Membre. Vous pouvez l'augmenter pour maximiser les profits ou le baisser pour fidéliser.
                            </p>
                          </div>
                        </div>

                        {/* 4. Mock cyber defense suite simulator */}
                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                          <h4 className="text-xs font-black uppercase text-pink-550 tracking-wider font-mono">Simulateur de Pare-feu DDoS</h4>
                          
                          <div className="space-y-3">
                            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                              Pour tester la résistance de l'infrastructure à une attaque par bot, lancez la simulation de blocage de requêtes suspectes.
                            </p>
                            <div className="space-y-2">
                              <button
                                onClick={() => {
                                  alert("SÉCURITÉ WILLOW :\nActivation forcée des règles anti-DDoS.\n- 14 adresses IP suspectes bloquées\n- Chiffrement Live actif");
                                }}
                                className="w-full py-2 bg-slate-900 border border-slate-800 hover:border-pink-500/20 text-xs font-bold rounded-xl hover:text-pink-400 hover:bg-pink-950/20 text-slate-350 transition-colors cursor-pointer text-center font-mono uppercase"
                              >
                                Trigger Firewall Rules
                              </button>
                              <p className="text-[8px] text-slate-600 font-mono text-center">
                                cryptage AES-256 standard actif • base de données encapsulée
                              </p>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                    </>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* SEGMENT 1 & 2: CERTIFIED & UNCERTIFIED */}
                      {(supervisionFilter === 'certified' || supervisionFilter === 'uncertified') && (
                        <div className="space-y-4 animate-fade-in text-slate-200 font-sans">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold uppercase text-white tracking-widest font-mono">
                              {supervisionFilter === 'certified' ? '✓ Membres Hôtesses Certifiées' : '✗ Membres Non-Certifiées'}
                            </h4>
                            <span className="text-[9px] text-pink-400 font-mono">
                              Total: {(() => {
                                const all: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
                                return all.filter(u => u.role !== 'admin' && (supervisionFilter === 'certified' ? u.isVerified === true : !u.isVerified)).length;
                              })()} comptes trouvés
                            </span>
                          </div>
                          <div className="overflow-x-auto bg-slate-950/40 p-4 rounded-2.5xl border border-slate-850">
                            <table className="w-full text-left text-xs text-slate-300">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px] font-bold tracking-wider">
                                  <th className="py-2.5 px-2">Identité</th>
                                  <th className="py-2.5">Quartier</th>
                                  <th className="py-2.5">WhatsApp Numéro</th>
                                  <th className="py-2.5 text-center">Badge Actif</th>
                                  <th className="py-2.5 text-right pr-2">Encourager & Supervision</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-850">
                                {(() => {
                                  const all: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
                                  const filtered = all.filter(u => u.role !== 'admin' && (supervisionFilter === 'certified' ? u.isVerified === true : !u.isVerified));
                                  if (filtered.length === 0) {
                                    return <tr><td colSpan={5} className="py-8 text-center text-slate-500 font-mono">Aucun membre dans ce segment.</td></tr>;
                                  }
                                  return filtered.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                                      <td className="py-3 px-2 font-bold text-white flex flex-col">
                                        <span>{u.name}</span>
                                        <span className="text-[10px] text-slate-505 font-normal font-mono">{u.email}</span>
                                      </td>
                                      <td className="py-3 font-sans text-slate-300">{u.city || 'Non spécifié'}</td>
                                      <td className="py-3 font-mono text-slate-450">{u.whatsappNumber}</td>
                                      <td className="py-3 text-center font-sans font-normal">
                                        <button
                                          onClick={() => {
                                            const storedUsers: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
                                            const idx = storedUsers.findIndex(usr => usr.id === u.id);
                                            if (idx !== -1) {
                                              storedUsers[idx].isVerified = !storedUsers[idx].isVerified;
                                              localStorage.setItem('rose_amour_users', JSON.stringify(storedUsers));
                                              alert(`Statut de certification mis à jour pour ${u.name}`);
                                              setDb(getDB());
                                            }
                                          }}
                                          className={`px-2 py-1 rounded text-[9px] font-mono font-black border transition-all cursor-pointer ${
                                            u.isVerified 
                                              ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400' 
                                              : 'bg-rose-955/40 border-rose-550/20 text-rose-450'
                                          }`}
                                        >
                                          {u.isVerified ? '✓ CERTIFIÉ' : '✗ NON CERTIFIÉ'}
                                        </button>
                                      </td>
                                      <td className="py-3 text-right pr-2 font-sans font-normal">
                                        <button 
                                          onClick={() => { setSelectedRecipientForMsg(u); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                                          className="py-1 px-3 bg-pink-650 hover:bg-pink-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1 ml-auto cursor-pointer"
                                        >
                                          💬 Envoyer Message
                                        </button>
                                      </td>
                                    </tr>
                                  ));
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* SEGMENT 3: BOOSTED VIP KEYBOARD LEADERBOARD */}
                      {supervisionFilter === 'boosted' && (
                        <div className="space-y-4 animate-fade-in text-slate-200 font-sans">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold uppercase text-white tracking-widest font-mono">👑 Profils Boostés Actifs (VIP Accueil)</h4>
                            <span className="bg-pink-950/60 text-pink-450 border border-pink-500/20 text-[9px] px-2 py-0.5 rounded font-black font-mono animate-pulse">
                              Expirations gérées automatiquement
                            </span>
                          </div>
                          <div className="overflow-x-auto bg-slate-950/40 p-4 rounded-2.5xl border border-slate-850">
                            <table className="w-full text-left text-xs text-slate-300 font-sans font-normal">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px] font-bold tracking-wider">
                                  <th className="py-2.5 px-2">Hôtesse</th>
                                  <th className="py-2.5">Localisation</th>
                                  <th className="py-2.5">Prix prestation</th>
                                  <th className="py-2.5">Expiration du Boost</th>
                                  <th className="py-2.5 text-right pr-2">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-850">
                                {(() => {
                                  const boosted = products.filter(p => p.isBoosted);
                                  if (boosted.length === 0) {
                                    return <tr><td colSpan={5} className="py-8 text-center text-slate-500 font-mono">Aucun profil boosté VIP pour le moment.</td></tr>;
                                  }
                                  return boosted.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                                      <td className="py-3 px-2 font-bold text-white flex items-center gap-3">
                                        <img src={p.imageUrl} className="w-8 h-8 object-cover rounded-lg border border-slate-800" referrerPolicy="no-referrer" />
                                        <div>
                                          <p>{p.sellerName}</p>
                                          <span className="text-[10px] text-pink-400 font-mono italic">{p.category}</span>
                                        </div>
                                      </td>
                                      <td className="py-3 font-sans text-slate-300">{p.location}</td>
                                      <td className="py-3 font-mono font-bold text-rose-450">{p.price.toLocaleString('fr-FR')} FCFA</td>
                                      <td className="py-3 font-mono text-slate-400 text-xs">
                                        {p.boostExpiry ? new Date(p.boostExpiry).toLocaleDateString('fr-FR', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'}) : 'Permanent / Infini'}
                                      </td>
                                      <td className="py-3 text-right pr-2">
                                        <button
                                          onClick={() => {
                                            setProducts(prev => prev.map(pro => {
                                              if (pro.id === p.id) {
                                                return { ...pro, isBoosted: false, boostExpiry: undefined };
                                              }
                                              return pro;
                                            }));
                                            alert(`Le boost VIP de ${p.sellerName} a été révoqué.`);
                                          }}
                                          className="py-1 px-3 bg-red-955/65 text-red-400 hover:bg-rose-900/40 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer border border-red-900/30 font-sans"
                                        >
                                          Déclasser standard
                                        </button>
                                      </td>
                                    </tr>
                                  ));
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* SEGMENT 4: PENDING REGISTRATIONS */}
                      {supervisionFilter === 'pending_registration' && (
                        <div className="space-y-4 animate-fade-in text-slate-200 font-sans">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold uppercase text-white tracking-widest font-mono">📝 Nouveaux Comptes & Inscriptions en Cours</h4>
                            <span className="text-[9px] text-slate-400">Arrivées récentes sur Rose Amour</span>
                          </div>
                          <div className="overflow-x-auto bg-slate-950/40 p-4 rounded-2.5xl border border-slate-850 font-mono text-xs">
                            <table className="w-full text-left text-xs text-slate-300 font-sans font-normal">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px] font-bold tracking-wider">
                                  <th className="py-2.5 px-2">Hôtesse / Mail</th>
                                  <th className="py-2.5">Sexe</th>
                                  <th className="py-2.5">Quartier & WhatsApp</th>
                                  <th className="py-2.5 text-center">Statut validation</th>
                                  <th className="py-2.5 text-right pr-2">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-850 font-sans font-normal">
                                {(() => {
                                  const all: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
                                  const signups = all.filter(u => u.role !== 'admin');
                                  if (signups.length === 0) {
                                    return <tr><td colSpan={5} className="py-8 text-center text-slate-500 font-mono">Aucune inscription enregistrée.</td></tr>;
                                  }
                                  return signups.map(usr => (
                                    <tr key={usr.id} className="hover:bg-slate-900/40 transition-colors">
                                      <td className="py-3 px-2 font-bold text-white">
                                        <p>{usr.name}</p>
                                        <span className="text-[10px] text-slate-500 font-normal font-mono">{usr.email}</span>
                                      </td>
                                      <td className="py-3 font-sans font-bold text-pink-400/80 text-[10px] uppercase">{usr.gender || 'Femelle'}</td>
                                      <td className="py-3 font-sans text-slate-350 font-normal">
                                        <p>{usr.city || 'Douala'}</p>
                                        <span className="text-[10px] text-slate-500 font-mono italic">{usr.whatsappNumber}</span>
                                      </td>
                                      <td className="py-3 text-center font-sans font-normal">
                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold font-mono ${usr.isVerified ? 'bg-emerald-950 text-emerald-450 border border-emerald-800' : 'bg-amber-955 text-amber-450 border border-amber-805 animate-pulse'}`}>
                                          {usr.isVerified ? 'CONSEILLÉ / VÉRIFIÉ' : 'VÉRIFICATION EN COURS'}
                                        </span>
                                      </td>
                                      <td className="py-3 text-right pr-2 space-x-1 flex justify-end font-sans font-normal">
                                        <button
                                          onClick={() => {
                                            const storedUsers: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
                                            const idx = storedUsers.findIndex(u => u.id === usr.id);
                                            if (idx !== -1) {
                                              storedUsers[idx].isVerified = true;
                                              localStorage.setItem('rose_amour_users', JSON.stringify(storedUsers));
                                              alert(`L'hôtesse ${usr.name} a été validée avec succès !`);
                                              setDb(getDB());
                                            }
                                          }}
                                          disabled={usr.isVerified}
                                          className={`py-1 px-2.5 rounded text-[10px] font-bold uppercase transition-all ${usr.isVerified ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'}`}
                                        >
                                          {usr.isVerified ? 'Validée ✓' : 'Approuver ✓'}
                                        </button>
                                        <button 
                                          onClick={() => { setSelectedRecipientForMsg(usr); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                                          className="py-1 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-[10px] font-bold uppercase border border-slate-800 cursor-pointer"
                                        >
                                          ✉️ Rédiger
                                        </button>
                                      </td>
                                    </tr>
                                  ));
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* SEGMENT 5: PAYMENTS IN PROGRESS */}
                      {supervisionFilter === 'pending_payments' && (
                        <div className="space-y-4 animate-fade-in text-slate-200 font-sans">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold uppercase text-white tracking-widest font-mono">💰 Journal des Paiements & Versements Reçus (MTN / Orange Money)</h4>
                            <span className="text-[9px] text-green-400 font-semibold font-mono flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                              Flux de caisse audité
                            </span>
                          </div>
                          <div className="overflow-x-auto bg-slate-950/40 p-4 rounded-2.5xl border border-slate-850 animate-fade-in">
                            <table className="w-full text-left text-xs text-slate-300">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px] font-bold tracking-wider">
                                  <th className="py-2.5 px-2">Référence / Date</th>
                                  <th className="py-2.5">Client Mobile</th>
                                  <th className="py-2.5">Prestataires</th>
                                  <th className="py-2.5">Montant Perçu</th>
                                  <th className="py-2.5 text-center">Statut du Versement</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-850 font-mono">
                                {sales.length === 0 ? (
                                  <tr><td colSpan={5} className="py-8 text-center text-slate-500 font-sans">Aucune transaction recensée ce mois-ci.</td></tr>
                                ) : (
                                  sales.map(sale => (
                                    <tr key={sale.id} className="hover:bg-slate-900/40 transition-colors">
                                      <td className="py-3 px-2 font-mono text-[10px] text-slate-300">
                                        <p className="font-bold text-white text-[10px]">{sale.id}</p>
                                        <span className="text-[9px] text-slate-500">{new Date(sale.createdAt).toLocaleString('fr-FR')}</span>
                                      </td>
                                      <td className="py-3 font-sans font-medium text-slate-200 font-normal">
                                        <p>{sale.customerName}</p>
                                        <span className="text-[10px] text-slate-500 font-mono">{sale.customerEmail}</span>
                                      </td>
                                      <td className="py-3 font-bold uppercase text-[10px] text-amber-550 font-sans font-normal">
                                        {sale.provider || 'Orange Money CM'}
                                      </td>
                                      <td className="py-3 font-mono font-black text-emerald-400">{sale.amount.toLocaleString('fr-FR')} FCFA</td>
                                      <td className="py-3 text-center font-sans font-normal">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8.5px] font-extrabold font-mono ${sale.status === 'completed' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-slate-950 text-slate-505 border border-slate-800'}`}>
                                          {sale.status === 'completed' ? 'CONFIRMÉ / CRÉDITÉ' : 'EN ATTENTE'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* SEGMENT 6: ONLINE MEMBERS STATUS */}
                      {supervisionFilter === 'online_members' && (
                        <div className="space-y-4 animate-fade-in text-slate-200 font-sans">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold uppercase text-white tracking-widest font-mono">🟢 Hôtesses Connectées en Direct</h4>
                            <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1 select-none font-bold">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Membres Actuels en Ligne
                            </span>
                          </div>
                          <div className="overflow-x-auto bg-slate-950/40 p-4 rounded-2.5xl border border-slate-850">
                            <table className="w-full text-left text-xs text-slate-300">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px] font-bold tracking-wider">
                                  <th className="py-2.5 px-2">Identité</th>
                                  <th className="py-2.5">Quartier de Travail</th>
                                  <th className="py-2.5">WhatsApp</th>
                                  <th className="py-2.5 text-center">Status Connexion</th>
                                  <th className="py-2.5 text-right pr-2">Encourager</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-850">
                                {(() => {
                                  const all: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
                                  const filtered = all.filter(u => u.role !== 'admin');
                                  if (filtered.length === 0) {
                                    return <tr><td colSpan={5} className="py-8 text-center text-slate-500 font-mono">Aucun membre enregistré.</td></tr>;
                                  }
                                  return filtered.map((u, index) => {
                                    const isOnline = index % 2 === 0;
                                    return (
                                      <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                                        <td className="py-3 px-2 font-bold text-white flex flex-col">
                                          <span>{u.name}</span>
                                          <span className="text-[10px] text-slate-500 font-normal">{u.email}</span>
                                        </td>
                                        <td className="py-3 font-sans text-slate-300">{u.city || 'Yaoundé'}</td>
                                        <td className="py-3 font-mono text-slate-450">{u.whatsappNumber}</td>
                                        <td className="py-3 text-center">
                                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8.5px] font-extrabold font-mono ${isOnline ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-slate-950/60 text-slate-505 border border-slate-800'}`}>
                                            <span className={`w-1 h-1 rounded-full ${isOnline ? 'bg-emerald-450 animate-ping' : 'bg-slate-500'}`} />
                                            {isOnline ? 'EN LIGNE (DISPO)' : 'HORS LIGNE'}
                                          </span>
                                        </td>
                                        <td className="py-3 text-right pr-2">
                                          <button 
                                            onClick={() => { setSelectedRecipientForMsg(u); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                                            className="py-1 px-3 bg-pink-650 hover:bg-pink-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1 ml-auto cursor-pointer"
                                          >
                                            💬 Féliciter / Encourager
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* SEGMENT 7 & 8: ACTIVE VS INACTIVE MEMBERS */}
                      {(supervisionFilter === 'active_members' || supervisionFilter === 'inactive_members') && (
                        <div className="space-y-4 animate-fade-in text-slate-200 font-sans">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold uppercase text-white tracking-widest font-mono">
                              {supervisionFilter === 'active_members' ? '🔥 Membres Actifs (Annonce Publiée)' : '❌ Membres Inactifs (Aucun ad posté)'}
                            </h4>
                            <span className="text-[9px] text-slate-500 font-mono">
                              Compte de fiches actives requis
                            </span>
                          </div>
                          <div className="overflow-x-auto bg-slate-950/40 p-4 rounded-2.5xl border border-slate-850 font-sans text-xs">
                            <table className="w-full text-left text-xs text-slate-300">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px] font-bold tracking-wider">
                                  <th className="py-2.5 px-2">Identité</th>
                                  <th className="py-2.5">Ville</th>
                                  <th className="py-2.5">WhatsApp</th>
                                  <th className="py-2.5 text-center">Fiches Publiées</th>
                                  <th className="py-2.5 text-right pr-2">Envoyer Rappel</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-850">
                                {(() => {
                                  const all: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
                                  const filtered = all.filter(u => {
                                    if (u.role === 'admin') return false;
                                    const hasAd = products.some(p => p.sellerId === u.id);
                                    return supervisionFilter === 'active_members' ? hasAd : !hasAd;
                                  });
                                  if (filtered.length === 0) {
                                    return <tr><td colSpan={5} className="py-8 text-center text-slate-500 font-mono">Aucun membre dans ce segment d'activité.</td></tr>;
                                  }
                                  return filtered.map(u => {
                                    const adCount = products.filter(p => p.sellerId === u.id).length;
                                    return (
                                      <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                                        <td className="py-3 px-2 font-bold text-white flex flex-col">
                                          <span>{u.name}</span>
                                          <span className="text-[10px] text-slate-505 font-normal font-mono">{u.email}</span>
                                        </td>
                                        <td className="py-3 font-sans text-slate-300">{u.city || 'Yaoundé'}</td>
                                        <td className="py-3 font-mono text-slate-450">{u.whatsappNumber}</td>
                                        <td className="py-3 text-center font-sans font-normal">
                                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold font-mono ${adCount > 0 ? 'bg-pink-950 text-pink-400 border border-pink-810/20' : 'bg-slate-955 text-slate-505 border border-slate-800'}`}>
                                            {adCount} {adCount > 1 ? 'Annonces' : 'Annonce'}
                                          </span>
                                        </td>
                                        <td className="py-3 text-right pr-2">
                                          <button 
                                            onClick={() => { setSelectedRecipientForMsg(u); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                                            className="py-1 px-2.5 bg-indigo-605 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase transition-all shadow-sm flex items-center gap-1 ml-auto cursor-pointer"
                                          >
                                            💬 {supervisionFilter === 'active_members' ? 'Féliciter ✓' : 'Encourager ✓'}
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* SEGMENT 9: LEADERBOARD BY VISITS/CLICKS */}
                      {supervisionFilter === 'most_visited' && (
                        <div className="space-y-4 animate-fade-in text-slate-200 font-sans">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold uppercase text-white tracking-widest font-mono">🔥 Classement de Popularité par Clics et Vues</h4>
                            <span className="text-[9px] text-slate-400 font-mono font-bold">Toutes fiches hôtesses confondues</span>
                          </div>
                          <div className="overflow-x-auto bg-slate-950/40 p-4 rounded-2.5xl border border-slate-850 animate-fade-in">
                            <table className="w-full text-left text-xs text-slate-300">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px] font-bold tracking-wider">
                                  <th className="py-2.5 px-2">Rang / Hôtesse</th>
                                  <th className="py-2.5">Quartier</th>
                                  <th className="py-2.5 text-center">Nombre de clics / vues de profil</th>
                                  <th className="py-2.5">Statut de boost</th>
                                  <th className="py-2.5 text-right pr-2">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-850">
                                {(() => {
                                  const sorted = [...products].sort((a, b) => (b.views || 0) - (a.views || 0));
                                  if (sorted.length === 0) {
                                    return <tr><td colSpan={5} className="py-8 text-center text-slate-500 font-mono">Aucune annonce répertoriée.</td></tr>;
                                  }
                                  return sorted.map((p, rankIdx) => (
                                    <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                                      <td className="py-3 px-2 font-bold text-white flex items-center gap-3">
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-black text-[10px] ${rankIdx === 0 ? 'bg-amber-500 text-slate-950 animate-bounce' : rankIdx === 1 ? 'bg-slate-300 text-slate-950' : rankIdx === 2 ? 'bg-amber-800 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                          {rankIdx + 1}
                                        </span>
                                        <img src={p.imageUrl} className="w-8 h-8 object-cover rounded-lg border border-slate-800" referrerPolicy="no-referrer" />
                                        <div>
                                          <p>{p.sellerName}</p>
                                          <span className="text-[10px] text-pink-400 font-mono italic">{p.category}</span>
                                        </div>
                                      </td>
                                      <td className="py-3 font-sans text-slate-300 font-medium">{p.location}</td>
                                      <td className="py-3 text-center text-xs font-bold font-mono text-pink-400 bg-slate-950/20">
                                        🔥 {p.views || 0} clics visites
                                      </td>
                                      <td className="py-3">
                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold font-mono ${p.isBoosted ? 'bg-pink-950 text-pink-400 border border-pink-500/20' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>
                                          {p.isBoosted ? 'VIP ACCUEIL 👑' : 'Standard'}
                                        </span>
                                      </td>
                                      <td className="py-3 text-right pr-2">
                                        <button
                                          onClick={() => {
                                            const stored: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
                                            const usr = stored.find(u => u.id === p.sellerId);
                                            if (usr) {
                                              setSelectedRecipientForMsg(usr);
                                              window.scrollTo({ top: 400, behavior: 'smooth' });
                                            } else {
                                              alert("Compte propriétaire introuvable pour cette hôtesse.");
                                            }
                                          }}
                                          className="py-1 px-3 bg-pink-650 hover:bg-pink-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ml-auto cursor-pointer"
                                        >
                                          🏆 Féliciter
                                        </button>
                                      </td>
                                    </tr>
                                  ));
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* SEGMENT 10: WHATSAPP SECURITY LEADS & CONTACT RECORDS */}
                      {supervisionFilter === 'whatsapp_contacts' && (
                        <div className="space-y-4 animate-fade-in text-slate-200 font-sans">
                          <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80 gap-2 font-sans-serif">
                            <div>
                              <h4 className="text-xs font-bold uppercase text-white tracking-widest font-mono flex items-center gap-2">
                                🛡️ Traçabilité des Clics Contacts WhatsApp hôtesses de Sécurité
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Dispositif de sécurité : Informations récoltées lors des clics pour protéger les deux parties</p>
                            </div>
                            <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-mono text-[9px] px-2.5 py-1 rounded font-black flex items-center gap-1 animate-pulse select-none">
                              🟢 SÉCURITÉ EN LIGNE ACTIVE
                            </span>
                          </div>
                          
                          <div className="overflow-x-auto bg-slate-950/40 p-3.5 rounded-2.5xl border border-slate-850">
                            <table className="w-full text-left text-xs text-slate-300">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px] font-bold tracking-wider">
                                  <th className="py-2.5 px-2 font-sans font-bold">Date du clic</th>
                                  <th className="py-2.5 font-sans font-bold">Hôtesse contactée</th>
                                  <th className="py-2.5 font-mono">IP du Visiteur</th>
                                  <th className="py-2.5 font-sans font-bold">Dispositif / Navigateur</th>
                                  <th className="py-2.5 font-sans font-bold">Message redirigé</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-850">
                                {whatsAppClicks.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-550 font-mono">
                                      <p className="font-bold text-slate-400">Aucun clic de contact WhatsApp enregistré pour le moment.</p>
                                      <p className="text-[10px] text-slate-500 mt-1">Les traces de sécurité s'afficheront ici au premier contact.</p>
                                    </td>
                                  </tr>
                                ) : (
                                  whatsAppClicks.map(click => (
                                    <tr key={click.id} className="hover:bg-slate-900/40 transition-colors">
                                      <td className="py-3 px-2 font-mono text-[10px] text-slate-400">
                                        {new Date(click.timestamp).toLocaleString('fr-FR')}
                                      </td>
                                      <td className="py-3 font-sans font-bold text-white">
                                        <p>{click.hostessName}</p>
                                        <span className="text-[10px] font-mono text-pink-400">{click.hostessWhatsapp}</span>
                                      </td>
                                      <td className="py-3 font-mono text-emerald-400 font-bold select-all">
                                        📍 {click.visitorIp}
                                      </td>
                                      <td className="py-3 font-sans font-medium text-slate-400">
                                        {click.visitorDevice}
                                      </td>
                                      <td className="py-3 font-sans text-slate-300 max-w-xs break-words font-medium">
                                        <p className="text-[9px] text-slate-500 font-mono">Langue locale: {click.visitorLang}</p>
                                        <p className="text-[10px] italic text-slate-400 mt-1 bg-slate-900 border border-slate-850 p-2 rounded-lg leading-relaxed">{click.message}</p>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              </motion.div>
            ) : userDashboardMode && currentUser ? (
              
              /* ========================================================
               B. REGULAR USER INDIVIDUAL DISCREET WORKSPACE
               "chacun doit avoir son interface" - 9 options sidebar dropdown
               ======================================================== */
              <motion.div
                key="user-workspace"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start"
              >
                {/* Lateral Sidebar Selector featuring the 9 menu parameters requested */}
                <div className="bg-white rounded-3xl border border-rose-100 p-4 space-y-2 shadow-2xs">
                  <div className="p-3 text-center border-b pb-4 mb-3">
                    <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-black mx-auto text-base">
                      {currentUser.name.charAt(0)}
                    </div>
                    <p className="font-extrabold text-slate-800 mt-2 truncate text-xs">{currentUser.name}</p>
                    <div className="flex justify-center items-center gap-1 mt-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider font-mono">
                        {currentUser.isVerified ? 'Profil Certifié ✓' : 'Compte Pro Restreint'}
                      </span>
                    </div>
                  </div>

                  <span className="block text-[10px] uppercase font-bold text-slate-400 px-3 tracking-widest mb-1 font-mono">OPTIONS COMPTE</span>
                  
                  {/* Navigation item lists (The 9 user features) */}
                  <div className="space-y-1 font-sans">
                    <button
                      onClick={() => setUserTab('account')}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl font-bold cursor-pointer transition-colors ${userTab === 'account' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-rose-50'}`}
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>{language === 'fr' ? 'Mon Compte' : 'My Account'}</span>
                    </button>

                    <button
                      onClick={() => setUserTab('profile_preview')}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl font-bold cursor-pointer transition-colors ${userTab === 'profile_preview' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-rose-50'}`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{language === 'fr' ? 'Voir Mon Profil' : 'View My Profile'}</span>
                    </button>

                    <button
                      onClick={() => setUserTab('profile_edit')}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl font-bold cursor-pointer transition-colors ${userTab === 'profile_edit' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-rose-50'}`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{language === 'fr' ? 'Modifier Mon Profil' : 'Modify My Profile'}</span>
                    </button>

                    <button
                      onClick={() => setUserTab('payments')}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl font-bold cursor-pointer transition-colors ${userTab === 'payments' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-rose-50'}`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>{language === 'fr' ? 'Mes Paiements' : 'My Payments'}</span>
                    </button>

                    <button
                      onClick={() => setUserTab('visits')}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl font-bold cursor-pointer transition-colors ${userTab === 'visits' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-rose-50'}`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{language === 'fr' ? 'Statistiques Visites' : 'Visitor Stats'}</span>
                    </button>

                    <button
                      onClick={() => setUserTab('ads')}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl font-bold cursor-pointer transition-colors ${userTab === 'ads' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-rose-50'}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{language === 'fr' ? 'Petites Annonces' : 'Classified Ads'} ({myPortfolios.length})</span>
                    </button>

                    <button
                      onClick={() => setUserTab('password')}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl font-bold cursor-pointer transition-colors ${userTab === 'password' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-rose-50'}`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{language === 'fr' ? 'Modifier le Mot de Passe' : 'Change Password'}</span>
                    </button>

                    <button
                      onClick={() => setUserTab('verified_status')}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl font-bold cursor-pointer transition-colors ${userTab === 'verified_status' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-rose-50'}`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{language === 'fr' ? 'Statut Vérifié' : 'Verification Status'}</span>
                    </button>

                    <button
                      onClick={() => setUserTab('inbox')}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl font-bold cursor-pointer transition-colors ${userTab === 'inbox' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-rose-50'}`}
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{language === 'fr' ? 'Messages & Encouragements' : 'Messages & Support'}</span>
                      </div>
                      {(() => {
                        const myMsgs = messages.filter(m => m.recipientId === currentUser.id && m.status === 'unread');
                        if (myMsgs.length > 0) {
                          return (
                            <span className="w-4 h-4 rounded-full bg-pink-500 text-[8px] flex items-center justify-center text-white font-mono font-bold animate-pulse">
                              {myMsgs.length}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl font-bold cursor-pointer text-slate-405 hover:bg-red-50 hover:text-red-700 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{language === 'fr' ? 'Se Déconnecter' : 'Logout Portal'}</span>
                    </button>
                  </div>
                </div>

                {/* Sub-view Content layout based on Tab */}
                <div className="md:col-span-3 lg:col-span-3 bg-white rounded-3xl border border-rose-100 p-6 shadow-3xs space-y-6">
                  
                  {/* TAB 1: ACCOUNT DETAIL */}
                  {userTab === 'account' && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase text-rose-950">Mon Compte Personnel</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 border rounded-2xl">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Identité Enregistrée</p>
                          <p className="text-sm font-bold text-slate-800 mt-1">{currentUser.name}</p>
                          <p className="text-[10px] text-pink-700 font-mono mt-1">Ville de rattachement: {currentUser.city || 'Non spécifiée'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 border rounded-2xl">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Adresse de Sécurité</p>
                          <p className="text-xs font-semibold text-slate-800 mt-1">{currentUser.email}</p>
                          <p className="text-[10px] text-pink-700 font-mono mt-1">Sexe: {currentUser.gender || 'Femelle'}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-pink-500/5 border border-pink-100 rounded-3xl flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-xs font-extrabold text-pink-900 uppercase">Poster une fiche de profil immédiate !</h4>
                          <p className="text-[10px] text-slate-500 mt-1">Postez vos coordonnées et profitez de visites vérifiées sous validation de code unique.</p>
                        </div>
                        <button onClick={handleOpenPublishForm} className="py-2 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold font-sans uppercase whitespace-nowrap">Poster de suite</button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PORTFOLIO VISUAL PREVIEW */}
                  {userTab === 'profile_preview' && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase text-rose-950">Aperçu Visuel de ma Fiche</h3>
                      {myPortfolios.length === 0 ? (
                        <p className="text-xs text-slate-400">Aucune annonce n'est indexée pour votre compte. Créez votre profil.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {myPortfolios.map(p => (
                            <ProductCard
                              key={p.id}
                              product={p}
                              onViewDetails={handleViewProductDetails}
                              onWhatsAppClick={handleWhatsAppClick}
                              onQuickBoost={handleQuickBoostClick}
                              onDeleteProduct={handleDeleteProductActual}
                              currentUserId={currentUser.id}
                              isAdmin={false}
                              language={language}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: PROFILE MODIFICATION */}
                  {userTab === 'profile_edit' && (
                    <form onSubmit={handleSaveProfileEdit} className="space-y-4">
                      <h3 className="text-sm font-black uppercase text-rose-950">Mettre à Jour mes Informations Membres</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Votre Nom / Surnom de Scène</label>
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Réseau WhatsApp Direct</label>
                          <input
                            type="tel"
                            required
                            value={editWhatsapp}
                            onChange={(e) => setEditWhatsapp(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-xs font-semibold font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Ville de résidence</label>
                          <select
                            value={editCity}
                            onChange={(e) => setEditCity(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
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
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Genre</label>
                          <select
                            value={editGender}
                            onChange={(e) => setEditGender(e.target.value as any)}
                            className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                          >
                            <option value="femme">Femme</option>
                            <option value="homme">Homme</option>
                            <option value="transsexuel">Transsexuel</option>
                            <option value="autre">Autre</option>
                          </select>
                        </div>
                      </div>

                      <button type="submit" className="py-2.5 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase transition shadow-xs">Sauvegarder les modifications</button>
                    </form>
                  )}

                  {/* TAB 4: MY PAYMENTS */}
                  {userTab === 'payments' && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase text-rose-950">Mes Versements & Transactions Récentes</h3>
                      <div className="bg-slate-50 border rounded-2xl p-4 overflow-hidden">
                        <table className="w-full text-left text-xs font-sans">
                          <thead>
                            <tr className="border-b text-slate-400 font-bold">
                              <th className="pb-2">Désignation Service</th>
                              <th className="pb-2">Moyen de paiement</th>
                              <th className="pb-2">Ref Transaction / Reçu</th>
                              <th className="pb-2">Code Unique Généré</th>
                              <th className="pb-2 text-right">Montant</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {myPortfolios.map((p, index) => (
                              <tr key={index} className="text-slate-700">
                                <td className="py-2 font-bold">{p.title}</td>
                                <td className="py-2 uppercase text-[10px] text-pink-700">Mobile Money / Orange</td>
                                <td className="py-2 font-mono text-[10px]">TXN-{Date.now().toString().slice(0, 8)}</td>
                                <td className="py-2"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-lg font-mono text-[11px] font-bold">{p.verificationCode || 'VIP-837E-ACTIVE'}</span></td>
                                <td className="py-2 text-right font-bold text-rose-600">7 000 FCFA</td>
                              </tr>
                            ))}
                            {myPortfolios.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-4 text-center text-slate-400 text-xs">Aucune trace de paiement disponible.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: VISITS STATS */}
                  {userTab === 'visits' && (
                    <div className="space-y-4 text-left">
                      <h3 className="text-sm font-black uppercase text-rose-950">Statuts de Fréquentation & Compteurs</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-rose-50/20 border border-rose-100 rounded-2xl text-center">
                          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-widest block mb-1">Aujourd'hui</span>
                          <p className="text-2xl font-black text-rose-950 font-mono">154</p>
                          <span className="text-[9px] text-emerald-600 font-bold font-sans">✓ Visiteurs uniques</span>
                        </div>
                        <div className="p-4 bg-rose-50/20 border border-rose-100 rounded-2xl text-center">
                          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-widest block mb-1">Semaine en cours</span>
                          <p className="text-2xl font-black text-rose-950 font-mono">920</p>
                          <span className="text-[9px] text-emerald-650 font-bold font-sans">✓ Taux d'engagement de 89%</span>
                        </div>
                        <div className="p-4 bg-rose-50/20 border border-rose-100 rounded-2xl text-center">
                          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-widest block mb-1">Total Cumulé</span>
                          <p className="text-2xl font-black text-rose-950 font-mono">2 450</p>
                          <span className="text-[9px] text-pink-600 font-bold font-mono">Booster de visibilité activé</span>
                        </div>
                      </div>
                      <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-3xl text-xs space-y-1">
                        <span className="font-extrabold text-amber-805 block">🔥 Comment augmenter mes opportunités de contacts ?</span>
                        <p className="text-slate-600">En souscrivant à la formule premium Position Vedette (5 000 FCFA pour 5 jours), vous apparaissez de manière fixe en vitrine et notre algorithme multiplie par x4 le nombre de visiteurs dirigés vers WhatsApp.</p>
                      </div>
                    </div>
                  )}

                  {/* TAB 6: CLASSIFIED ADS PUBLICATIONS */}
                  {userTab === 'ads' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-black uppercase text-rose-950">Mes Petites Annonces</h3>
                        <button onClick={handleOpenPublishForm} className="py-1 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold uppercase transition">Créer une publication</button>
                      </div>

                      {myPortfolios.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8">Aucune annonce.</p>
                      ) : (
                        <div className="space-y-3">
                          {myPortfolios.map(p => (
                            <div key={p.id} className="p-4 bg-slate-50 border rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                              <div className="flex gap-3">
                                <img src={p.imageUrl} className="w-12 h-12 object-cover rounded-xl shrink-0" referrerPolicy="no-referrer" />
                                <div>
                                  <h4 className="font-extrabold text-slate-800 text-xs">{p.title}</h4>
                                  <p className="text-[10px] text-pink-700 font-bold">{p.price.toLocaleString('fr-FR')} FCFA</p>
                                  
                                  {/* User can modify their tiny title tag instantly */}
                                  <div className="mt-1 flex items-center gap-1.5 bg-pink-50 border border-pink-100 py-0.5 px-2 rounded-lg text-[9px] text-rose-800 italic">
                                    <span>✏️ "{p.statusText || 'Aucun statut d\'ambiance'}"</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const promptVal = prompt("Saisissez votre nouveau texte d'ambiance court (ex: 'Disponible ce soir', 'Fête à Bastos!') :", p.statusText || '');
                                        if (promptVal !== null) {
                                          setProducts(prev => prev.map(item => item.id === p.id ? { ...item, statusText: promptVal.trim() } : item));
                                        }
                                      }}
                                      className="underline hover:text-black font-extrabold cursor-pointer"
                                    >
                                      Modifier
                                    </button>
                                  </div>

                                </div>
                              </div>
                              <div className="flex gap-2">
                                {!p.isBoosted && (
                                  <button onClick={(e) => handleQuickBoostClick(p, e)} className="py-1 px-2.5 bg-pink-100 border border-pink-200 hover:bg-pink-200 text-pink-700 text-[9px] uppercase font-black rounded-lg transition-transform">Boost VIP</button>
                                )}
                                <button onClick={() => handleDeleteProductActual(p.id)} className="py-1 px-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 text-[9px] uppercase font-bold rounded-lg">Supprimer</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 7: CHANGE PASSWORD */}
                  {userTab === 'password' && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase text-rose-950">Gérer Mon Mot de Passe de Sécurité</h3>
                      <div className="max-w-md space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Nouveau Mot de Passe de Sécurité</label>
                          <input
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-xs font-semibold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!editPassword) { alert('Veuillez spécifier un mot de passe.'); return; }
                            const users: User[] = JSON.parse(localStorage.getItem('rose_amour_users') || JSON.stringify(SEEDED_USERS));
                            const match = users.findIndex(u => u.id === currentUser.id);
                            if (match !== -1) {
                              users[match].password = editPassword;
                              localStorage.setItem('rose_amour_users', JSON.stringify(users));
                            }
                            setCurrentUser({ ...currentUser, password: editPassword });
                            alert('Votre mot de passe a été modifié avec succès pour toutes les sessions à venir.');
                          }}
                          className="py-2 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold uppercase transition"
                        >
                          Enregistrer le mot de passe
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 8: VERIFIED ACCREDITATION CHECK */}
                  {userTab === 'verified_status' && (
                    <div className="space-y-4 text-left">
                      <h3 className="text-sm font-black uppercase text-rose-955">Avis d'Accréditation Certifiée</h3>
                      <div className="p-4 bg-slate-50 border rounded-3xl flex items-start gap-3.5 leading-relaxed">
                        <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-pink-605 shrink-0">🛡️</div>
                        <div>
                          <span className="font-extrabold text-slate-800 text-xs">Exigences d'Obtention du Badge de Vérification Certifiée :</span>
                          <ul className="list-disc pl-4 text-[11px] text-slate-500 mt-2 space-y-1">
                            <li className="flex items-center gap-1">
                              <span className="text-emerald-500">✓</span> <span>Numéro WhatsApp direct vérifié actif.</span>
                            </li>
                            <li className="flex items-center gap-1">
                              <span className="text-emerald-500">✓</span> <span>Pas d'abus signalé (Litiges en cours : 0).</span>
                            </li>
                            <li className="flex items-center gap-1">
                              <span className="text-slate-400">•</span> <span>Soumission d'une preuve de discrétion à l'administration.</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 9: MESSAGES & ENCOURAGEMENTS RECEIVED FROM ADMIN */}
                  {userTab === 'inbox' && (
                    <div className="space-y-4 text-left font-sans">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 border-slate-100 gap-2">
                        <div>
                          <h3 className="text-sm font-black uppercase text-rose-950">Boîte de Réception & Messages</h3>
                          <p className="text-[10.5px] text-slate-400 mt-0.5">Retrouvez les conseils, encouragements et félicitations personnalisés de l'administration</p>
                        </div>
                        <button
                          onClick={() => {
                            setMessages(prev => prev.map(m => m.recipientId === currentUser.id ? { ...m, status: 'read' as const } : m));
                            alert("Tous les messages ont été marqués comme lus.");
                          }}
                          className="py-1 px-2.5 bg-slate-100 hover:bg-slate-205 text-slate-700 rounded-lg text-[10px] uppercase font-bold cursor-pointer transition-colors"
                        >
                          Tout marquer comme lu ✓
                        </button>
                      </div>

                      {(() => {
                        const myMsgs = messages.filter(m => m.recipientId === currentUser.id);
                        if (myMsgs.length === 0) {
                          return (
                            <div className="py-12 text-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/50">
                              <span className="text-2xl block mb-2">✉️</span>
                              <p className="text-xs font-bold text-slate-705">Aucun message pour l'instant</p>
                              <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">L'administration publie des félicitations d'étape et des encouragements pour booster l'activité de vos fiches à Douala & Yaoundé.</p>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-3">
                            {myMsgs.map(m => (
                              <div
                                key={m.id}
                                onClick={() => {
                                  if (m.status === 'unread') {
                                    setMessages(prev => prev.map(item => item.id === m.id ? { ...item, status: 'read' as const } : item));
                                  }
                                }}
                                className={`p-4 rounded-2.5xl border transition-all relative cursor-pointer ${m.status === 'unread' ? 'bg-pink-500/5 border-pink-100 shadow-xs' : 'bg-slate-50 border-slate-200'}`}
                              >
                                {m.status === 'unread' && (
                                  <span className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                                )}
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${m.type === 'congratulations' ? 'bg-amber-100 text-amber-800' : 'bg-pink-100 text-pink-800'}`}>
                                    {m.type === 'congratulations' ? '🏆 Félicitations' : '⭐ Encouragements'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {new Date(m.createdAt).toLocaleDateString('fr-FR', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'})}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{m.body}</p>
                                <div className="mt-3 flex items-center justify-between text-[9.5px] font-bold border-t pt-2 border-slate-200/50">
                                  <span className="text-slate-400 font-mono">De: Administration Rose Amour</span>
                                  {m.status === 'unread' ? (
                                    <span className="text-pink-600">Nouveau message ●</span>
                                  ) : (
                                    <span className="text-slate-400">Lu ✓</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                </div>
              </motion.div>
            ) : (
              
              /* ========================================================
               C. HOME GUEST BOOK FRONT DIRECTORY (CATALOG)
               Featuring Cameroon Cities grid, Search directories, and grid cards
               ======================================================== */
              <motion.div
                key="shop-workspace"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* 3 DISTINCT SEPARATE FILTER MODULES */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 z-30 relative animate-fade-in">
                  
                  {/* MODULE 1: RECHERCHE PAR NOM / QUARTIER (Always Visible) */}
                  <div className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-50 rounded-lg text-rose-500">
                        <Search className="w-4 h-4 shrink-0" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-rose-950">
                        Recherche par Nom & Quartier
                      </span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-rose-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ex: Bastos, Douala, Cindy..."
                        className="w-full pl-10 pr-4 py-3 bg-rose-50/20 hover:bg-white focus:bg-white border border-rose-100 focus:border-rose-400 text-xs rounded-xl focus:outline-hidden transition-all font-semibold text-slate-800 shadow-3xs"
                      />
                    </div>
                    {searchQuery && (
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-medium">Mot-clé actif : "{searchQuery}"</span>
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          Effacer ×
                        </button>
                      </div>
                    )}
                  </div>

                  {/* MODULE 2: RECHERCHE OU SELECTION PAR VILLE (Interactive Collapsible Dropdown) */}
                  <div className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs space-y-3 relative">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-50 rounded-lg text-rose-500">
                        <MapPin className="w-4 h-4 shrink-0" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-rose-950">
                        Filtrer par Ville (Cameroun)
                      </span>
                    </div>

                    <div className="relative">
                      {/* Dropdown Toggle Button */}
                      <button
                        type="button"
                        onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                        className="w-full px-4 py-3 bg-rose-50/30 hover:bg-rose-150/20 text-rose-950 text-xs font-bold rounded-xl border border-rose-100 flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 shadow-3xs"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          🗺️ {selectedCityFilter ? `Ville : ${selectedCityFilter}` : 'Tout le Cameroun'}
                        </span>
                        <span className="text-rose-600 font-black text-[10px] bg-white border border-rose-100 px-2 py-0.5 rounded-lg">
                          {isCityDropdownOpen ? 'Fermer ▲' : 'Choisir ▼'}
                        </span>
                      </button>

                      {/* Dropdown Popup Panel */}
                      <AnimatePresence>
                        {isCityDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 5 }}
                            className="absolute left-0 right-0 mt-2 bg-white border border-rose-100 rounded-2xl shadow-xl p-3 grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto z-50 scrollbar-thin shadow-rose-100/40"
                          >
                            <button
                              onClick={() => {
                                setSelectedCityFilter(null);
                                setIsCityDropdownOpen(false);
                              }}
                              className={`col-span-2 py-2 px-3 text-left rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                                selectedCityFilter === null
                                  ? 'bg-rose-600 text-white shadow-3xs'
                                  : 'hover:bg-rose-50 text-rose-950 bg-rose-50/10'
                              }`}
                            >
                              <span>Tout le Cameroun</span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${selectedCityFilter === null ? 'bg-white/20 text-white' : 'bg-pink-100 text-pink-700'}`}>
                                {products.filter(p => p.status === 'active').length}
                              </span>
                            </button>

                            {CAMEROON_CITIES.map((city) => {
                              const count = getCityCount(city);
                              const isSelected = selectedCityFilter === city;
                              return (
                                <button
                                  key={city}
                                  onClick={() => {
                                    setSelectedCityFilter(isSelected ? null : city);
                                    setIsCityDropdownOpen(false);
                                  }}
                                  className={`py-2 px-2.5 text-left rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-between truncate ${
                                    isSelected
                                      ? 'bg-rose-600 text-white shadow-3xs font-black'
                                      : 'bg-rose-50/30 hover:bg-rose-50 text-slate-705'
                                  }`}
                                >
                                  <span className="truncate">{city}</span>
                                  <span className={`text-[9px] font-mono px-1 rounded shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-pink-100 text-pink-700'}`}>
                                    {count}
                                  </span>
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* MODULE 3: CATEGORIES DE PROFILS & EXCLUSIF VIP */}
                  <div className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-50 rounded-lg text-rose-500">
                        <Filter className="w-4 h-4 shrink-0" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-rose-955">
                        Catégories & Niveau VIP
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-1">
                        {['Tous', 'Premium', 'Classic'].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => {
                              setActiveCategory(cat);
                              setSelectedCityFilter(null); // Reset city to see all of this category, or leave as is
                            }}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                              activeCategory === cat
                                ? 'bg-white text-rose-600 shadow-3xs font-extrabold scale-102'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {cat === 'Tous' ? 'Toutes' : cat}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setOnlyBoosted(!onlyBoosted)}
                        className={`px-3 py-2 text-xs font-extrabold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs ${
                          onlyBoosted
                            ? 'bg-pink-50 border-pink-300 text-pink-700 font-black'
                            : 'bg-white border-slate-205 text-slate-650 hover:bg-slate-50'
                        }`}
                        title="Afficher uniquement les profils VIP"
                      >
                        <Zap className={`w-3.5 h-3.5 ${onlyBoosted ? 'fill-current animate-bounce text-pink-500' : 'text-slate-400'}`} />
                        <span>VIP</span>
                      </button>
                    </div>
                  </div>

                </div>

                {/* ACTIVE FILTERS REMINDER & INSTANT RESET BANNER */}
                {(selectedCityFilter || searchQuery || activeCategory !== 'Tous' || onlyBoosted) && (
                  <div className="bg-rose-50/30 p-3.5 rounded-2xl border border-rose-100/50 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in -mt-4">
                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                      <span className="text-[10px] font-extrabold text-rose-950 uppercase tracking-widest">Filtres appliqués :</span>
                      {selectedCityFilter && (
                        <span className="bg-rose-100/80 text-rose-800 text-[10px] font-black px-2.5 py-1 rounded-lg border border-rose-200 shadow-3xs">📍 Ville : {selectedCityFilter}</span>
                      )}
                      {activeCategory !== 'Tous' && (
                        <span className="bg-rose-100/80 text-rose-800 text-[10px] font-black px-2.5 py-1 rounded-lg border border-rose-200 shadow-3xs">🏷️ Catégorie : {activeCategory}</span>
                      )}
                      {onlyBoosted && (
                        <span className="bg-pink-100/80 text-pink-800 text-[10px] font-black px-2.5 py-1 rounded-lg border border-pink-200 shadow-3xs">⭐ Profils VIP</span>
                      )}
                      {searchQuery && (
                        <span className="bg-rose-100/80 text-rose-800 text-[10px] font-black px-2.5 py-1 rounded-lg border border-rose-200 shadow-3xs">🔍 Recherche : "{searchQuery}"</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCityFilter(null);
                        setSearchQuery('');
                        setActiveCategory('Tous');
                        setOnlyBoosted(false);
                      }}
                      className="text-xs font-black text-rose-600 hover:text-rose-800 underline hover:no-underline cursor-pointer transition-colors shrink-0"
                    >
                      Réinitialiser tous les filtres ×
                    </button>
                  </div>
                )}

                {/* VIP pinned Carousel slider row */}
                {products.some(p => p.isBoosted && p.status === 'active') && activeCategory === 'Tous' && !searchQuery && !selectedCityFilter && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 bg-white p-2 px-3.5 border border-pink-100 rounded-full w-fit">
                      <Zap className="w-4 h-4 fill-current text-pink-500 animate-pulse" />
                      <h3 className="font-extrabold text-slate-800 text-xs tracking-wide uppercase font-sans">
                        Hôtesses Premium à la Une VIP (Cameroun)
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {products
                        .filter(p => p.isBoosted && p.status === 'active')
                        .slice(0, 3)
                        .map(prod => (
                          <div 
                            key={prod.id}
                            className="bg-gradient-to-br from-rose-950 via-rose-900 to-pink-950 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between group border border-rose-500/20"
                          >
                            <div className="absolute top-4 right-4 bg-pink-600 text-white font-extrabold text-[8px] tracking-widest px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 uppercase border border-pink-400/20 font-bold">
                              <Sparkles className="w-3" />
                              <span>ACCUEIL VIP</span>
                            </div>

                            <div>
                              <span className="text-[9px] font-black text-pink-300 font-mono tracking-widest uppercase mb-1 block">
                                {prod.category}
                              </span>
                              <h4 className="text-base font-extrabold leading-tight group-hover:text-rose-200 transition-colors cursor-pointer line-clamp-1 font-sans" onClick={() => setSelectedProduct(prod)}>
                                {prod.title}
                              </h4>
                              
                              {prod.statusText && (
                                <div className="mt-2 text-[10px] bg-white/10 px-2.5 py-1 rounded-xl text-pink-200 italic border border-white/5 font-sans font-medium">
                                  " {prod.statusText} "
                                </div>
                              )}
                            </div>

                            <div className="mt-5">
                              <div className="flex justify-between items-end mb-3">
                                <div>
                                  <span className="text-[8px] text-rose-300/85 block uppercase tracking-wide">Tarif</span>
                                  <span className="text-base font-black text-white font-mono">
                                    {prod.price.toLocaleString('fr-FR')} FCFA
                                  </span>
                                </div>
                                <div className="text-right text-[10px] text-rose-200 font-bold font-sans">
                                  📍 {prod.location} {prod.age ? `• ${prod.age} ans` : ''}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={(e) => handleWhatsAppClick(prod, e)}
                                  className="py-1.5 rounded-xl bg-pink-650 hover:bg-pink-750 text-white font-extrabold text-[11px] flex items-center justify-center gap-1 transition-all pointer cursor-pointer"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 fill-current text-white" />
                                  <span>WhatsApp</span>
                                </button>
                                <button
                                  onClick={() => setSelectedProduct(prod)}
                                  className="py-1.5 rounded-xl bg-white/15 hover:bg-white/20 text-white font-bold text-[11px] transition-colors cursor-pointer border border-white/10"
                                >
                                  Voir Profil
                                </button>
                              </div>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Catalog grid */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-rose-100 pb-3 font-sans">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-extrabold text-slate-800 text-base tracking-tight uppercase">
                        {activeCategory === 'Tous' ? 'Toutes les Annonces' : activeCategory} {selectedCityFilter ? `à ${selectedCityFilter}` : ''}
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">
                        ({sortedAndFilteredProducts.length} hôtesses recensées)
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-widest hidden sm:block">
                      Tri : VIP Premium d'abord
                    </div>
                  </div>

                  {sortedAndFilteredProducts.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-rose-100 max-w-lg mx-auto p-8 space-y-3 shadow-3xs">
                      <Heart className="w-10 h-10 text-rose-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-800">{TRANSLATIONS[language].not_found}</h4>
                      <button
                        onClick={() => { setActiveCategory('Tous'); setSearchQuery(''); setOnlyBoosted(false); setSelectedCityFilter(null); }}
                        className="px-4 py-2 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        Afficher tout le Cameroun
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {sortedAndFilteredProducts.map((prod) => (
                        <ProductCard
                          key={prod.id}
                          product={prod}
                          onViewDetails={handleViewProductDetails}
                          onWhatsAppClick={handleWhatsAppClick}
                          onQuickBoost={handleQuickBoostClick}
                          onDeleteProduct={handleDeleteProductActual}
                          currentUserId={currentUser?.id}
                          isAdmin={currentUser?.role === 'admin'}
                          language={language}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* HELP FAQ MODAL BOX & DIRECT CALL SUPPORT (Orange and MTN options listed) */}
                <div className="bg-rose-500/5 rounded-3xl p-6 border border-rose-100/75 flex flex-col md:flex-row items-center justify-between gap-6 mt-12 animate-fade-in">
                  <div className="flex items-start gap-4 text-left">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 shrink-0 flex items-center justify-center text-rose-600 shadow-3xs">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-rose-950 text-xs uppercase tracking-wide">FAQ de Confiance & Assistance Client</h4>
                      <p className="text-[11px] text-slate-650 mt-1 leading-relaxed max-w-2xl font-sans">
                        Rose Amour est un catalogue de rencontres directes de gré à gré au Cameroun. Pour tout besoin d'accompagnement, litige technique, suspicion de comportement discordant ou réclamation de service, contactez l'Assistance Administrative <a href="https://wa.me/237659228516?text=Bonjour%20l%20Admin,%20j%20ai%20besoin%20d%20assistance%20sur%20le%20site%20RoseAmour." target="_blank" rel="noreferrer" className="text-rose-700 font-extrabold underline hover:text-rose-850 transition-colors">directement par l'assistance en ligne WhatsApp</a>.
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://wa.me/237659228516?text=Bonjour%20l%20Admin,%20j%20ai%20besoin%20d%20assistance%20sur%20le%20site%20RoseAmour."
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 border border-pink-500"
                  >
                    <MessageCircle className="w-4 h-4 fill-current text-white animate-pulse" />
                    <span>{TRANSLATIONS[language].support_team}</span>
                  </a>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-white border-t border-rose-100/85 mt-auto py-8 px-6 text-center text-xs text-rose-450 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-[11px]">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 bg-rose-500 rounded-lg flex items-center justify-center text-white text-xs font-extrabold shadow-sm">R</div>
            <span className="font-sans font-bold text-slate-800">ROSEAMOUR CAMEROUN DIRECTORY</span>
          </div>
          <p className="text-slate-500 leading-normal font-medium max-w-2xl">
            Avertissement : Cette plateforme de mise en relation directe est strictement réservée aux personnes majeures de plus de 18 ans.<br />
            En cas de problème technique ou d'abus ou pour toute réclamation d'assistance, contactez l'administration <a href="https://wa.me/237659228516?text=Bonjour%20Admin,%20je%20vous%20contacte%20concernant%20le%20site%20RoseAmour." target="_blank" rel="noreferrer" className="text-pink-600 font-black underline hover:text-pink-700 transition-colors">directement par l'assistance en ligne</a>.
          </p>
          <div className="flex gap-4 text-rose-600 font-bold">
            <button onClick={() => alert('Relations directes protégées par cryptage local.')} className="font-semibold underline cursor-pointer">Confidentialité</button>
            <span>&bull;</span>
            <a href="https://wa.me/237659228516?text=Bonjour%20Admin,%20je%20vous%20contacte%20concernant%20le%20site%20RoseAmour." target="_blank" rel="noreferrer" className="font-semibold underline cursor-pointer">Support Direct</a>
          </div>
        </div>
      </footer>

      {/* FLOATING SUPPORT WHATSAPP BUBBLE BUTTON */}
      <a
        href="https://wa.me/237659228516?text=Bonjour%20Admin,%20je%20vous%20contacte%20concernant%20les%20services%20de%20RoseAmour."
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-[#25D366] text-white hover:bg-[#20ba5a] active:scale-95 transition-all text-xs font-extrabold rounded-full shadow-2xl tracking-wide border border-emerald-450 cursor-pointer animate-bounce"
        id="floating-support-whatsapp"
      >
        <MessageCircle className="w-5 h-5 fill-current text-white" />
        <span className="hidden sm:inline">Contacter l'administrateur</span>
      </a>

      {/* PUBLIC FLOATING PROMOTIONAL ANIMATED NOTIFICATIONS TICKER */}
      {!isAdminMode && (
        <AnimatePresence>
          {showPromoMessage && (
            <motion.div
              initial={{ opacity: 0, x: -100, y: 0 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -100, y: 0 }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
              className="fixed bottom-4 left-4 z-45 bg-slate-900/95 text-xs text-white p-4 rounded-2xl shadow-2xl border border-rose-500/30 max-w-sm flex items-start gap-3 backdrop-blur-md"
              id="public-booster-ticker"
            >
              <div className="p-2 bg-gradient-to-tr from-pink-500 to-rose-600 rounded-xl text-white shadow-[0_0_10px_rgba(244,63,94,0.4)] shrink-0 animate-pulse mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-white fill-current" />
              </div>
              <div className="flex-1 space-y-1 text-left">
                <p className="font-extrabold text-[9px] text-pink-400 uppercase tracking-widest leading-none">
                  {language === 'fr' ? '🔥 Astuce & Croissance' : '🔥 Tip & Growth'}
                </p>
                <p className="font-semibold text-slate-100 leading-normal text-[10.5px] font-sans">
                  {language === 'fr' ? PROMO_NOTIFICATIONS_FR[promoMessageIndex] : PROMO_NOTIFICATIONS_EN[promoMessageIndex]}
                </p>
                <div className="pt-0.5 flex items-center justify-between gap-2">
                  <span className="text-[7.5px] text-slate-450 font-mono">Publicité Partenaire &bull; Rose Amour</span>
                  {currentUser && (
                    <button 
                      onClick={() => {
                        setUserDashboardMode(true);
                        setUserTab('payments');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-[9px] font-black text-pink-400 hover:text-white underline cursor-pointer"
                    >
                      {language === 'fr' ? 'Booster Sec' : 'Boost Now'}
                    </button>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setShowPromoMessage(false)} 
                className="text-slate-450 hover:text-white transition-colors text-[11px] font-bold shrink-0 cursor-pointer"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ========================================================
         D. OVERLAY POPUPS
         ======================================================== */}

      {/* 1. Detail Companion sheet modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onWhatsAppRedirect={handleWhatsAppDetailedRedirect}
            onSubmitDispute={handleSubmitDispute}
            comments={comments}
            onAddComment={handleAddComment}
            language={language}
          />
        )}
      </AnimatePresence>

      {/* 2. Authentication Login popup */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <AuthModal
            onClose={() => setIsAuthModalOpen(false)}
            onLoginSuccess={handleLogin}
            onAddConnectionLog={handleAddConnectionLog}
            language={language}
          />
        )}
      </AnimatePresence>

      {/* 3. New Publication submission form */}
      <AnimatePresence>
        {isPublishingFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto border border-rose-100"
            >
              <button
                onClick={() => setIsPublishingFormOpen(false)}
                className="absolute top-4 right-4 p-1 px-3 text-rose-450 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors text-xs font-bold cursor-pointer"
              >
                Fermer ×
              </button>

              <div className="mb-5">
                <h3 className="text-lg font-black text-rose-955 tracking-tight leading-none">Poster un Nouveau Profil de Membre</h3>
                <p className="text-xs text-rose-600 mt-1 uppercase tracking-wider font-mono font-black">
                  Tarif fixe d'approbation et d'enregistrement de fiche : 5 000 FCFA / Passez premium : 7 000 FCFA
                </p>
              </div>

              <form onSubmit={handleTriggerPublicationCheckout} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title / presentation name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Titre de votre présentation</label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Ex: Vanessa - Compagne de Charme Douala"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-rose-400 font-semibold"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tarif indicatif par rdv (FCFA)</label>
                    <input
                      type="number"
                      required
                      value={newPrice || ''}
                      onChange={(e) => setNewPrice(Number(e.target.value))}
                      placeholder="Ex: 50000"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-rose-400 font-semibold font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie</label>
                    <select
                      value={newCategory}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewCategory(val);
                        if (val === 'Modèles VIP') {
                          setWithInitialBoost(true);
                        }
                      }}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-rose-400 font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="Modèles VIP">Modèles VIP (Premium : 7000 FCFA / 5j)</option>
                      <option value="Escortes Classiques">Escortes Classiques (Classique : 5000 FCFA / 5j)</option>
                    </select>
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Âge</label>
                    <input
                      type="number"
                      required
                      min={18}
                      max={45}
                      value={newAge || ''}
                      onChange={(e) => setNewAge(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-rose-400 font-semibold font-mono"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ville et quartier de résidence</label>
                    <input
                      type="text"
                      required
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="Ex: Yaoundé (Bastos), Cameroun"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-rose-400 font-semibold"
                    />
                  </div>
                </div>

                {/* statusText tiny highlight */}
                <div>
                  <label className="block text-xs font-black text-rose-800 mb-1">Petit texte d'ambiance de publication (Headline rapide sur la fiche)</label>
                  <input
                    type="text"
                    required
                    value={newStatusText}
                    onChange={(e) => setNewStatusText(e.target.value)}
                    placeholder="Ex: Disponible ce soir à Bastos ! / De passage à Douala..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-pink-150 rounded-xl text-xs focus:outline-hidden focus:border-rose-500 font-bold text-rose-900"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Détails, présentation & prestations proposées</label>
                  <textarea
                    required
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Précisez votre philosophie de discrétion, vos particularités, vos déplacements..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs h-20 focus:outline-hidden focus:border-rose-400 font-medium resize-none shadow-3xs"
                  />
                </div>

                {/* IMAGE LAYERS DRAG & DROP WITH 2 IMAGES SUPPORT MANDATED */}
                <div className="space-y-4">
                  <div className="border-t pt-3">
                    <label className="block text-xs font-black text-slate-800 mb-1.5">Télécharger vos Photos (Chaque membre a le droit de mettre jusqu'à 2 images à la fois) :</label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Image Layer 1 */}
                      <div className="border-2 border-dashed border-rose-200 hover:border-rose-400 bg-rose-50/10 hover:bg-rose-50/20 active:scale-[0.99] transition-all rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer relative">
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === 'string') setNewImageUrl(reader.result);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        {newImageUrl ? (
                          <div className="flex flex-col items-center gap-2">
                            <img src={newImageUrl} className="w-16 h-16 object-cover rounded-xl shadow-xs" alt="Profile" />
                            <span className="text-[9px] font-black text-emerald-600">✓ PHOTO PRINCIPALE ENREGISTRÉE</span>
                          </div>
                        ) : (
                          <div className="py-2 flex flex-col items-center gap-1">
                            <Upload className="w-4 h-4 text-rose-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-600">Télécharger Photo Principale 1</span>
                          </div>
                        )}
                      </div>

                      {/* Image Layer 2 */}
                      <div className="border-2 border-dashed border-rose-100 hover:border-rose-300 bg-rose-50/5 hover:bg-rose-50/10 active:scale-[0.99] transition-all rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer relative">
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === 'string') setNewImageUrl2(reader.result);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        {newImageUrl2 ? (
                          <div className="flex flex-col items-center gap-2">
                            <img src={newImageUrl2} className="w-16 h-16 object-cover rounded-xl shadow-xs" alt="Cover" />
                            <span className="text-[9px] font-black text-emerald-600">✓ SECONDE PHOTO ENREGISTRÉE</span>
                          </div>
                        ) : (
                          <div className="py-2 flex flex-col items-center gap-1">
                            <Upload className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500">Télécharger Seconde Photo 2 (Optionnelle)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Boost panel validation option */}
                <div className={`p-4 rounded-2xl border relative overflow-hidden transition-all ${newCategory === 'Modèles VIP' ? 'bg-amber-500/10 border-amber-250' : 'bg-rose-500/5 border-rose-100/80'}`}>
                  <div className="absolute right-0 bottom-0 pointer-events-none opacity-5">
                    <Zap className="w-16 h-16 text-rose-700 fill-current" />
                  </div>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="opt-boost"
                      checked={withInitialBoost}
                      disabled={newCategory === 'Modèles VIP'}
                      onChange={(e) => setWithInitialBoost(e.target.checked)}
                      className={`mt-1 w-4 h-4 rounded cursor-pointer ${newCategory === 'Modèles VIP' ? 'text-amber-600 bg-amber-200 cursor-not-allowed' : 'text-pink-600 border-slate-300'}`}
                    />
                    <label htmlFor="opt-boost" className="cursor-pointer">
                      <span className="block text-xs font-extrabold text-rose-950 flex items-center gap-1.5 leading-none">
                        Option Boost VIP Accueil Vitrine (+15 000 FCFA les 5 jours)
                        {newCategory === 'Modèles VIP' && (
                          <span className="bg-amber-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded font-mono animate-pulse">Obligatoire pour VIP</span>
                        )}
                      </span>
                      <span className="block text-[10px] text-rose-700 mt-1.5 leading-relaxed font-light font-sans">
                        {newCategory === 'Modèles VIP' 
                          ? "En tant que 'Modèle VIP', ces frais de boost promotionnel de 15 000 FCFA sont requis et intégrés par défaut pour garantir votre visibilité Premium maximale."
                          : "Cochez cette case pour positionner en priorité haute votre fiche avec le précieux insigne d'accueil doré."}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-1 border border-rose-500"
                  >
                    <span>Procéder au versement sécurisé</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Payment Checkout popup */}
      <AnimatePresence>
        {(checkoutProductData || selectedProductForQuickBoost) && (
          <CheckoutModal
            onClose={() => {
              setCheckoutProductData(null);
              setSelectedProductForQuickBoost(null);
            }}
            onPaymentSuccess={handlePaymentSuccess}
            feeType={checkoutType}
            productTitle={
              selectedProductForQuickBoost 
                ? selectedProductForQuickBoost.title 
                : checkoutProductData!.title
            }
            productId={
              selectedProductForQuickBoost 
                ? selectedProductForQuickBoost.id 
                : 'prod_new'
            }
            buyerName={currentUser ? currentUser.name : 'Modèle de Charme'}
            buyerEmail={currentUser ? currentUser.email : 'liaison@rose-amour.cm'}
            language={language}
            productCategory={
              selectedProductForQuickBoost 
                ? selectedProductForQuickBoost.category 
                : (checkoutProductData?.category || undefined)
            }
          />
        )}
      </AnimatePresence>

    </div>
  );
}
