export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  whatsappNumber: string;
  avatarUrl?: string;
  createdAt: string;
  city?: string;
  gender?: 'femme' | 'homme' | 'transsexuel' | 'autre' | 'Femelle' | 'Mâle' | 'Couple' | 'Gay';
  password?: string;
  isVerified?: boolean;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  sellerId: string;
  sellerName: string;
  sellerWhatsapp: string;
  imageUrl: string;
  imageUrl2?: string; // Saisie facultative de la deuxième photo
  isBoosted: boolean;
  boostExpiry?: string;
  createdAt: string;
  status: 'active' | 'sold' | 'disputed';
  location: string;
  statusText?: string; // Short custom text on their publication
  age?: number;        // Age of the model
  verificationCode?: string; // Code unique généré automatiquement pour confirmation de paiement
  planType?: 'premium' | 'vedette' | 'visites'; 
  paymentConfirmed?: boolean;
  cityGroup?: string; // Douala, Yaoundé, Bafoussam, etc.
  views?: number;    // Counter for profile clicks/visits
}

export interface Comment {
  id: string;
  productId: string;
  authorName: string;
  rating: number; // 1-5 rating
  content: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  productId: string;
  productTitle: string;
  buyerName: string;
  buyerEmail: string;
  customerName?: string;
  customerEmail?: string;
  amount: number;
  feeType: 'standard_item' | 'list_fee' | 'boost_fee';
  paymentMethod: 'card' | 'orange_money' | 'mtn_money';
  provider?: string;
  status: 'completed' | 'refunded';
  createdAt: string;
}

export interface ConnectionLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  loginTime: string;
  ipAddress: string;
  device: string;
}

export interface Dispute {
  id: string;
  productId: string;
  productTitle: string;
  sellerId: string;
  sellerName: string;
  sellerWhatsapp?: string;
  complaintUser: string;
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'rejected';
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  recipientId: string;
  senderName: string;
  content: string;
  body?: string;
  status?: string;
  createdAt: string;
  isRead: boolean;
  type: 'encouragement' | 'congratulations' | 'general';
}

export interface WhatsAppClickLog {
  id: string;
  productId: string;
  productTitle: string;
  hostessName: string;
  hostessWhatsapp: string;
  visitorIp: string;
  visitorDevice: string;
  visitorLang: string;
  visitorUsername?: string;
  message: string;
  timestamp: string;
}

