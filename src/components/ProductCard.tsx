import React from 'react';
import { Product } from '../types';
import { MessageCircle, Zap, MapPin, Sparkles, User, Star, Trash2, Heart } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductCardProps {
  key?: any;
  product: Product;
  onViewDetails: (product: Product) => void;
  onWhatsAppClick: (product: Product, event: React.MouseEvent) => void;
  onQuickBoost?: (product: Product, event: React.MouseEvent) => void;
  onDeleteProduct?: (prodId: string) => void;
  currentUserId?: string;
  isAdmin?: boolean;
  language?: 'fr' | 'en';
}

export default function ProductCard({
  product,
  onViewDetails,
  onWhatsAppClick,
  onQuickBoost,
  onDeleteProduct,
  currentUserId,
  isAdmin,
  language = 'fr'
}: ProductCardProps) {
  const isOwner = currentUserId === product.sellerId;

  // Format price in FCFA beautifully
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      maximumFractionDigits: 0
    }).format(price).replace('XAF', 'FCFA');
  };

  const isFr = language === 'fr';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      id={`product-card-${product.id}`}
      className={`relative flex flex-col overflow-hidden bg-white rounded-3xl border transition-all duration-300 ${
        product.isBoosted
          ? 'border-rose-400 shadow-md shadow-rose-100 ring-2 ring-rose-450/20'
          : 'border-rose-100/60 shadow-xs hover:shadow-md'
      }`}
    >
      {/* Top badges banner */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        {/* Category badge */}
        <span className="px-3 py-1 text-[11px] font-bold text-rose-700 bg-white/95 backdrop-blur-xs rounded-full shadow-xs border border-rose-100">
          {product.category}
        </span>

        {/* Boosted status badge */}
        {product.isBoosted && (
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="flex items-center gap-1 px-3 py-1 text-[10px] font-extrabold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-full shadow-xs border border-rose-400"
          >
            <Sparkles className="w-3 h-3 fill-current text-white" />
            <span>{isFr ? 'VIP ACCUEIL' : 'VIP DIRECTORY'}</span>
          </motion.div>
        )}
      </div>

      {/* Image container */}
      <div 
        className="relative w-full aspect-4/5 overflow-hidden cursor-pointer group"
        onClick={() => onViewDetails(product)}
      >
        <img
          src={product.imageUrl}
          alt={product.title}
          referrerPolicy="no-referrer"
          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-108"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        
        {/* Price Tag & Location overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="bg-rose-650/90 backdrop-blur-xs text-white font-extrabold px-3 py-1.5 rounded-xl text-xs tracking-wide shadow-xs">
            {formatPrice(product.price)}
          </div>
          {product.age && (
            <div className="bg-slate-900/80 backdrop-blur-xs text-white font-bold px-2 py-1 rounded-lg text-xs font-mono">
              {product.age} {isFr ? 'ans' : 'y.o.'}
            </div>
          )}
        </div>
      </div>

      {/* Profile Info Content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Location & City */}
        <div className="flex items-center gap-1 text-[11px] text-rose-600 mb-1 font-semibold">
          <MapPin className="w-3.5 h-3.5" />
          <span>{product.location}</span>
          <span className="mx-1 font-light text-rose-200">|</span>
          <span className="font-medium text-slate-400">
            {new Date(product.createdAt).toLocaleDateString(isFr ? 'fr-FR' : 'en-US', {
              day: 'numeric',
              month: 'short'
            })}
          </span>
        </div>

        {/* Title */}
        <h3 
          className="text-[17px] font-black text-slate-800 line-clamp-1 hover:text-rose-600 cursor-pointer mb-2 transition-colors duration-200 font-sans"
          onClick={() => onViewDetails(product)}
        >
          {product.title}
        </h3>

        {/* --- EXPLICIT REQUIRED USER STATUS TEXT --- */}
        {/* "les utilisateurs peuvent ajouter un petit texte sur leur publication" */}
        {product.statusText ? (
          <div className="mb-3 px-3 py-2 bg-pink-50/60 border border-pink-100 rounded-2xl text-[13px] text-pink-800 italic font-semibold leading-tight relative overflow-hidden">
            <span className="absolute left-0 top-0 bottom-0 w-1 bg-pink-400" />
            "{product.statusText}"
          </div>
        ) : (
          <div className="mb-3 h-[30px] flex items-center">
            <span className="text-xs text-slate-350 italic">{isFr ? "Aucun message d'ambiance" : "No mood message"}</span>
          </div>
        )}

        {/* Description Snippet */}
        <p className="text-[13px] text-slate-650 line-clamp-2 mb-4 leading-relaxed flex-1">
          {product.description}
        </p>

        {/* Card footer: Listing owner or delete tool if isOwner or isAdmin */}
        <div className="flex items-center gap-2 pt-3 border-t border-rose-50 mb-4 text-xs text-slate-600">
          <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[10px]">
            {product.sellerName.substring(0, 2).toUpperCase()}
          </div>
          <span className="font-semibold text-slate-700 truncate flex-1">
            {product.sellerName}
          </span>
          {isOwner && (
            <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-lg font-black font-mono">
              {isFr ? 'MON ANNONCE' : 'MY ADS'}
            </span>
          )}
          
          {(isAdmin || isOwner) && onDeleteProduct && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteProduct(product.id);
              }}
              title={isFr ? "Retirer cette fiche" : "Remove this card"}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Interactive Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          {/* Main Direct WhatsApp contact */}
          <button
            id={`whatsapp-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onWhatsAppClick(product, e);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-xl transition-all duration-300 shadow-xs active:scale-95 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-current text-white" />
            <span>WhatsApp</span>
          </button>

          {/* Quick Boost for owner, else View details */}
          {isOwner && !product.isBoosted ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickBoost && onQuickBoost(product, e);
              }}
              className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-55 hover:bg-rose-100 rounded-xl transition-colors duration-200 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-rose-500 fill-current animate-pulse" />
              <span>{isFr ? 'Booster VIP' : 'VIP Boost'}</span>
            </button>
          ) : (
            <button
              onClick={() => onViewDetails(product)}
              className="flex items-center justify-center py-2 text-xs font-extrabold text-slate-700 bg-slate-50 hover:bg-rose-100 hover:text-rose-700 rounded-xl transition-colors duration-200 cursor-pointer"
            >
              {isFr ? 'Voir Profil' : 'View Profile'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
