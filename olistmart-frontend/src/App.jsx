// ============================================================
// ONECART - Full-Stack E-Commerce Platform
// Stack: React + Node/Express Backend + MySQL
// ============================================================
import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = "http://localhost:5000/api";

// ─── HELPERS ──────────────────────────────────────────────────
function makeName(categoryEn, categoryRaw, productId) {
  const cat = (categoryEn || categoryRaw || "Product")
    .replace(/_/g, " ")
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const code = (productId || "").slice(-5).toUpperCase();
  return `${cat} #${code}`;
}

function fmtPrice(v) { return `R$ ${(parseFloat(v)||0).toFixed(2)}`; }

async function apiCall(endpoint, method="GET", body=null, tok=null) {
  const headers = { "Content-Type": "application/json" };
  if (tok) headers["Authorization"] = `Bearer ${tok}`;
  const r = await fetch(`${API_BASE}${endpoint}`, {
    method, headers, body: body ? JSON.stringify(body) : null
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
  return data;
}

const DEMO_USERS = {
  "user@demo.com":   { password:"user123",   role:"user",   name:"Priya Sharma", id:"u1" },
  "seller@demo.com": { password:"seller123", role:"seller", name:"Raj Stores",   id:"s1" },
  "admin@demo.com":  { password:"admin123",  role:"admin",  name:"Admin Master", id:"a1" },
};

// ─── ICONS ────────────────────────────────────────────────────
const Icon = ({ name, size=20, color="currentColor" }) => {
  const I = {
    cart:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
    heart:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    star:   <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    pkg:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    truck:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    user:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    logout: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    bell:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    chart:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    plus:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    edit:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
    check:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
    x:      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    filter: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
    sort:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
    ai:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
    eye:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    card:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    alert:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    store:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    shield: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    settings:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41"/></svg>,
    chevron:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
    tag:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  };
  return I[name] || null;
};

// ─── TOAST ────────────────────────────────────────────────────
function Toast({ message, type="success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  const bg = { success:"#10b981", error:"#ef4444", info:"#3b82f6", warning:"#f59e0b" }[type];
  return (
    <div style={{ position:"fixed",top:20,right:20,zIndex:9999,background:bg,color:"#fff",padding:"12px 20px",borderRadius:12,boxShadow:"0 4px 24px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",gap:10,fontWeight:600,fontSize:14,animation:"slideIn 0.3s ease" }}>
      {message}
      <button onClick={onClose} style={{ background:"none",border:"none",color:"#fff",cursor:"pointer" }}><Icon name="x" size={16}/></button>
    </div>
  );
}

// ─── STAR RATING ──────────────────────────────────────────────
function StarRating({ rating, editable=false, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display:"flex",gap:2 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s}
          onClick={editable ? () => onChange(s) : null}
          onMouseEnter={editable ? () => setHover(s) : null}
          onMouseLeave={editable ? () => setHover(0) : null}
          style={{ cursor:editable?"pointer":"default", color:s<=(hover||rating)?"#f59e0b":"#d1d5db" }}>
          <Icon name="star" size={15} color="currentColor"/>
        </span>
      ))}
    </div>
  );
}

// ─── PAGINATION ───────────────────────────────────────────────
function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  const build = () => {
    const d = 2, range = [];
    for (let i = Math.max(2, page-d); i <= Math.min(totalPages-1, page+d); i++) range.push(i);
    const res = [1];
    if (range[0] > 2) res.push("...");
    res.push(...range);
    if (range[range.length-1] < totalPages-1) res.push("...");
    if (totalPages > 1) res.push(totalPages);
    return res;
  };
  const btn = (active, disabled) => ({
    minWidth:36, height:36, border:`1px solid ${active?"#1e40af":"#e5e7eb"}`,
    background:active?"#1e40af":"#fff", color:active?"#fff":disabled?"#d1d5db":"#374151",
    borderRadius:8, fontSize:13, fontWeight:active?700:400,
    display:"flex", alignItems:"center", justifyContent:"center",
    padding:"0 6px", cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.4:1,
  });
  return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginTop:32,flexWrap:"wrap" }}>
      <button style={btn(false, page===1)} onClick={() => page>1 && onPage(page-1)}>←</button>
      {build().map((p,i) =>
        p==="..." ? <span key={`d${i}`} style={{color:"#9ca3af",padding:"0 4px"}}>…</span>
        : <button key={p} style={btn(p===page,false)} onClick={() => onPage(p)}>{p}</button>
      )}
      <button style={btn(false, page===totalPages)} onClick={() => page<totalPages && onPage(page+1)}>→</button>
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────
function ProductCard({ product, onAddCart, onFavorite, favorites=[], onClick }) {
  const isFav = favorites.includes(product.product_id);
  const name = makeName(product.category_en, product.product_category_name, product.product_id);
  const price = parseFloat(product.price) || 0;
  const freight = parseFloat(product.freight_value) || 0;
  const rating = parseFloat(product.rating) || 0;
  const orders = parseInt(product.total_orders) || 0;

  // Deterministic image from product_id hash
  const imgSeed = (product.product_id || "").slice(0,8).split("").reduce((a,c) => a+c.charCodeAt(0), 0) % 1000;
  const imgUrl = `https://picsum.photos/seed/${imgSeed}/300/300`;

  return (
    <div
      onClick={() => onClick(product)}
      style={{ background:"#fff",borderRadius:16,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",overflow:"hidden",cursor:"pointer",transition:"transform 0.2s,box-shadow 0.2s",border:"1px solid #f0f0f0" }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow="0 8px 30px rgba(0,0,0,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.07)"; }}
    >
      <div style={{ position:"relative" }}>
        <img src={imgUrl} alt={name} style={{ width:"100%",height:190,objectFit:"cover" }}/>
        <button
          onClick={e => { e.stopPropagation(); onFavorite(product.product_id); }}
          style={{ position:"absolute",top:10,right:10,background:"rgba(255,255,255,0.92)",border:"none",borderRadius:"50%",width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.15)" }}
        >
          <Icon name="heart" size={17} color={isFav?"#ef4444":"#9ca3af"}/>
        </button>
        {orders > 0 && (
          <div style={{ position:"absolute",bottom:10,left:10,background:"#1e40af",color:"#fff",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600 }}>
            {orders} sold
          </div>
        )}
      </div>
      <div style={{ padding:"13px 15px" }}>
        <div style={{ fontSize:10,color:"#6b7280",textTransform:"uppercase",letterSpacing:1,marginBottom:4 }}>
          {(product.category_en || product.product_category_name || "").replace(/_/g," ")}
        </div>
        <div style={{ fontWeight:700,fontSize:14,color:"#111827",marginBottom:6,minHeight:40,lineHeight:1.35 }}>
          {name}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:8 }}>
          <StarRating rating={rating}/>
          <span style={{ fontSize:11,color:"#6b7280" }}>
            {rating>0?`${rating.toFixed(1)} (${product.review_count||0})`:"No reviews"}
          </span>
        </div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:19,fontWeight:800,color:"#1e40af" }}>
              {price>0 ? fmtPrice(price) : "—"}
            </div>
            {freight>0 && <div style={{ fontSize:11,color:"#9ca3af" }}>+ {fmtPrice(freight)} frete</div>}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onAddCart(product); }}
            style={{ background:"#1e40af",color:"#fff",border:"none",borderRadius:10,padding:"8px 13px",cursor:"pointer",fontWeight:600,fontSize:12,display:"flex",alignItems:"center",gap:5 }}
          >
            <Icon name="cart" size={13} color="#fff"/> Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PRODUCT DETAIL MODAL ─────────────────────────────────────
function ProductModal({ product, onClose, onAddCart, user }) {
  const [review, setReview] = useState({ score:5, title:"", message:"" });
  const [reviews, setReviews] = useState([
    { score:5,title:"Great product!",message:"Very satisfied with this purchase.",user:"Maria S.",date:"2024-01-15" },
    { score:4,title:"Good value",message:"Product as described, fast delivery.",user:"João P.",date:"2024-01-10" },
  ]);
  const [qty, setQty] = useState(1);
  const [deliveryEst, setDeliveryEst] = useState(null);
  const [zip, setZip] = useState("");

  if (!product) return null;

  const name = makeName(product.category_en, product.product_category_name, product.product_id);
  const price = parseFloat(product.price) || 0;
  const freight = parseFloat(product.freight_value) || 0;
  const rating = parseFloat(product.rating) || 0;
  const imgSeed = (product.product_id||"").slice(0,8).split("").reduce((a,c)=>a+c.charCodeAt(0),0)%1000;

  const estimateDelivery = () => {
    if (!zip) return;
    const days = 3 + Math.floor(Math.random()*7);
    const d = new Date(); d.setDate(d.getDate()+days);
    setDeliveryEst({ days, date: d.toLocaleDateString("en-IN", { weekday:"long",month:"long",day:"numeric" }) });
  };

  const submitReview = () => {
    setReviews([{ ...review,user:user?.name||"Anonymous",date:new Date().toISOString().split("T")[0] }, ...reviews]);
    setReview({ score:5,title:"",message:"" });
  };

  const inputSt = { padding:"10px 14px",border:"1px solid #e5e7eb",borderRadius:10,fontSize:13,width:"100%",boxSizing:"border-box",outline:"none" };

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:20,overflowY:"auto" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:20,maxWidth:720,width:"100%",marginTop:24,marginBottom:24,overflow:"hidden",boxShadow:"0 25px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr" }}>
          <img src={`https://picsum.photos/seed/${imgSeed}/400/400`} alt={name} style={{ width:"100%",height:320,objectFit:"cover" }}/>
          <div style={{ padding:28,display:"flex",flexDirection:"column",gap:10 }}>
            <button onClick={onClose} style={{ alignSelf:"flex-end",background:"#f3f4f6",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Icon name="x" size={15}/>
            </button>
            <div style={{ fontSize:10,color:"#6b7280",textTransform:"uppercase",letterSpacing:1.2 }}>
              {(product.category_en||product.product_category_name||"").replace(/_/g," ")}
            </div>
            <h2 style={{ fontSize:20,fontWeight:800,color:"#111827",margin:0,lineHeight:1.3 }}>{name}</h2>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <StarRating rating={rating}/>
              <span style={{ fontSize:12,color:"#6b7280" }}>{rating>0?rating.toFixed(1):"No rating"} ({product.review_count||0} reviews)</span>
            </div>
            <div style={{ fontSize:26,fontWeight:800,color:"#1e40af" }}>{price>0?fmtPrice(price):"—"}</div>
            {freight>0 && <div style={{ fontSize:12,color:"#6b7280" }}>Frete: {fmtPrice(freight)}</div>}
            {product.product_weight_g>0 && <div style={{ fontSize:12,color:"#6b7280" }}>Weight: {(product.product_weight_g/1000).toFixed(2)} kg</div>}
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ display:"flex",alignItems:"center",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden" }}>
                <button onClick={()=>setQty(Math.max(1,qty-1))} style={{ padding:"8px 14px",border:"none",background:"#f9fafb",cursor:"pointer",fontWeight:700,fontSize:15 }}>-</button>
                <span style={{ padding:"8px 12px",fontWeight:600,fontSize:14 }}>{qty}</span>
                <button onClick={()=>setQty(qty+1)} style={{ padding:"8px 14px",border:"none",background:"#f9fafb",cursor:"pointer",fontWeight:700,fontSize:15 }}>+</button>
              </div>
              <button onClick={()=>onAddCart(product,qty)} style={{ flex:1,background:"#1e40af",color:"#fff",border:"none",borderRadius:10,padding:"12px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:14 }}>
                <Icon name="cart" size={15} color="#fff"/> Add to Cart
              </button>
            </div>
            <div style={{ background:"#f0f9ff",borderRadius:12,padding:14 }}>
              <div style={{ fontWeight:600,fontSize:12,marginBottom:8,color:"#1e40af",display:"flex",alignItems:"center",gap:5 }}>
                <Icon name="truck" size={13} color="#1e40af"/> Delivery Estimate
              </div>
              <div style={{ display:"flex",gap:6 }}>
                <input value={zip} onChange={e=>setZip(e.target.value)} placeholder="Enter ZIP code" style={{ flex:1,padding:"7px 10px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:12,outline:"none" }}/>
                <button onClick={estimateDelivery} style={{ background:"#1e40af",color:"#fff",border:"none",borderRadius:8,padding:"7px 12px",cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap" }}>Check</button>
              </div>
              {deliveryEst && <div style={{ marginTop:8,color:"#065f46",fontWeight:600,fontSize:12 }}>📦 Arrives in {deliveryEst.days} days ({deliveryEst.date})</div>}
            </div>
          </div>
        </div>

        <div style={{ padding:"0 28px 28px" }}>
          <h3 style={{ fontSize:15,fontWeight:700,marginBottom:6,color:"#111827" }}>About this product</h3>
          <p style={{ color:"#4b5563",fontSize:13,lineHeight:1.6 }}>
            Premium quality {(product.category_en||product.product_category_name||"").replace(/_/g," ")} product from our curated Olist catalog.
            {product.product_description_length > 0 ? ` This listing has a detailed description of ${product.product_description_length} characters and ${product.product_photos_qty||0} product photos.` : ""}
          </p>

          {user?.role==="user" && (
            <>
              <h3 style={{ fontSize:15,fontWeight:700,margin:"20px 0 10px",color:"#111827" }}>Write a Review</h3>
              <div style={{ background:"#f9fafb",borderRadius:12,padding:16,display:"flex",flexDirection:"column",gap:10 }}>
                <StarRating rating={review.score} editable onChange={s=>setReview({...review,score:s})}/>
                <input placeholder="Review title" value={review.title} onChange={e=>setReview({...review,title:e.target.value})} style={inputSt}/>
                <textarea placeholder="Your experience..." value={review.message} onChange={e=>setReview({...review,message:e.target.value})} rows={3} style={{...inputSt,resize:"none"}}/>
                <button onClick={submitReview} style={{ alignSelf:"flex-start",background:"#1e40af",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",cursor:"pointer",fontWeight:600,fontSize:13 }}>Submit</button>
              </div>
            </>
          )}

          <h3 style={{ fontSize:15,fontWeight:700,margin:"20px 0 10px",color:"#111827" }}>Customer Reviews</h3>
          {reviews.map((r,i) => (
            <div key={i} style={{ borderBottom:"1px solid #f3f4f6",paddingBottom:12,marginBottom:12 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                <StarRating rating={r.score}/><span style={{ fontWeight:600,fontSize:13 }}>{r.title}</span>
              </div>
              <p style={{ color:"#4b5563",fontSize:13,margin:"4px 0" }}>{r.message}</p>
              <span style={{ fontSize:11,color:"#9ca3af" }}>{r.user} · {r.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CART SIDEBAR ─────────────────────────────────────────────
function CartSidebar({ cart, onClose, onUpdateQty, onRemove, onCheckout }) {
  const total = cart.reduce((s,i) => s + (parseFloat(i.price)||0)*i.qty, 0);
  const freight = cart.reduce((s,i) => s + (parseFloat(i.freight_value)||0), 0);
  return (
    <div style={{ position:"fixed",inset:0,zIndex:800,display:"flex" }}>
      <div onClick={onClose} style={{ flex:1,background:"rgba(0,0,0,0.4)" }}/>
      <div style={{ width:400,background:"#fff",display:"flex",flexDirection:"column",boxShadow:"-8px 0 40px rgba(0,0,0,0.15)" }}>
        <div style={{ padding:"20px 24px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <h2 style={{ margin:0,fontSize:19,fontWeight:700,display:"flex",alignItems:"center",gap:10 }}>
            <Icon name="cart" size={21} color="#1e40af"/> Cart ({cart.length})
          </h2>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer" }}><Icon name="x" size={20}/></button>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:"16px 24px",display:"flex",flexDirection:"column",gap:12 }}>
          {cart.length===0
            ? <div style={{ textAlign:"center",color:"#9ca3af",padding:"50px 0" }}><Icon name="cart" size={48} color="#d1d5db"/><p style={{ marginTop:14,fontWeight:500 }}>Your cart is empty</p></div>
            : cart.map((item,i) => {
                const nm = makeName(item.category_en, item.product_category_name, item.product_id);
                const imgSeed = (item.product_id||"").slice(0,8).split("").reduce((a,c)=>a+c.charCodeAt(0),0)%1000;
                return (
                  <div key={i} style={{ display:"flex",gap:12,background:"#f9fafb",borderRadius:12,padding:12 }}>
                    <img src={`https://picsum.photos/seed/${imgSeed}/80/80`} alt={nm} style={{ width:60,height:60,objectFit:"cover",borderRadius:8 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600,fontSize:13,color:"#111827",marginBottom:2 }}>{nm}</div>
                      <div style={{ fontSize:13,color:"#1e40af",fontWeight:700 }}>{fmtPrice(item.price)}</div>
                      <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:6 }}>
                        <button onClick={()=>onUpdateQty(i,item.qty-1)} style={{ width:26,height:26,border:"1px solid #e5e7eb",borderRadius:6,background:"#fff",cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center" }}>-</button>
                        <span style={{ fontWeight:600,fontSize:14 }}>{item.qty}</span>
                        <button onClick={()=>onUpdateQty(i,item.qty+1)} style={{ width:26,height:26,border:"1px solid #e5e7eb",borderRadius:6,background:"#fff",cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
                        <button onClick={()=>onRemove(i)} style={{ marginLeft:"auto",background:"none",border:"none",cursor:"pointer" }}><Icon name="trash" size={15} color="#ef4444"/></button>
                      </div>
                    </div>
                  </div>
                );
              })
          }
        </div>
        {cart.length>0 && (
          <div style={{ padding:"16px 24px",borderTop:"1px solid #f3f4f6" }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:14,color:"#6b7280" }}><span>Subtotal</span><span>{fmtPrice(total)}</span></div>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12,fontSize:14,color:"#6b7280" }}><span>Freight</span><span>{fmtPrice(freight)}</span></div>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:16,fontSize:18,fontWeight:800,color:"#111827" }}><span>Total</span><span>{fmtPrice(total+freight)}</span></div>
            <button onClick={onCheckout} style={{ width:"100%",background:"#1e40af",color:"#fff",border:"none",borderRadius:12,padding:14,fontWeight:700,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
              <Icon name="card" size={17} color="#fff"/> Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CHECKOUT MODAL ───────────────────────────────────────────
function CheckoutModal({ cart, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [addr, setAddr] = useState({ street:"",city:"",state:"",zip:"" });
  const [pay, setPay] = useState({ type:"credit_card",card:"",expiry:"",cvv:"",inst:1 });
  const [processing, setProcessing] = useState(false);
  const total = cart.reduce((s,i) => s+(parseFloat(i.price)||0)*i.qty+(parseFloat(i.freight_value)||0), 0);
  const inp = { width:"100%",padding:"12px 14px",border:"1.5px solid #e5e7eb",borderRadius:10,fontSize:14,boxSizing:"border-box",outline:"none",marginBottom:10 };

  const processPayment = async () => {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 2000));
    setProcessing(false);
    setStep(3);
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div style={{ background:"#fff",borderRadius:20,width:"100%",maxWidth:500,padding:32,maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
          <h2 style={{ margin:0,fontSize:21,fontWeight:800 }}>Checkout</h2>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer" }}><Icon name="x" size={20}/></button>
        </div>
        <div style={{ display:"flex",gap:6,marginBottom:24 }}>
          {["Delivery","Payment","Done"].map((s,i) => (
            <div key={i} style={{ flex:1,textAlign:"center" }}>
              <div style={{ width:30,height:30,borderRadius:"50%",background:step>i?"#1e40af":step===i+1?"#1e40af":"#e5e7eb",color:step>=i+1?"#fff":"#9ca3af",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 5px",fontWeight:700,fontSize:12 }}>
                {step>i+1?<Icon name="check" size={14} color="#fff"/>:i+1}
              </div>
              <div style={{ fontSize:11,color:step===i+1?"#1e40af":"#9ca3af",fontWeight:step===i+1?700:400 }}>{s}</div>
            </div>
          ))}
        </div>

        {step===1 && (
          <>
            <h3 style={{ fontSize:15,fontWeight:700,marginBottom:14 }}>Delivery Address</h3>
            {[["street","Street & Number"],["city","City"],["state","State"],["zip","ZIP Code"]].map(([k,pl]) => (
              <input key={k} placeholder={pl} value={addr[k]} onChange={e=>setAddr({...addr,[k]:e.target.value})} style={inp}/>
            ))}
            <button onClick={()=>setStep(2)} style={{ width:"100%",background:"#1e40af",color:"#fff",border:"none",borderRadius:12,padding:13,fontWeight:700,fontSize:15,cursor:"pointer",marginTop:6 }}>Continue →</button>
          </>
        )}

        {step===2 && (
          <>
            <h3 style={{ fontSize:15,fontWeight:700,marginBottom:14 }}>Payment Method</h3>
            <div style={{ display:"flex",gap:8,marginBottom:16 }}>
              {[{id:"credit_card",label:"Credit Card"},{id:"pix",label:"PIX"},{id:"boleto",label:"Boleto"}].map(p => (
                <button key={p.id} onClick={()=>setPay({...pay,type:p.id})} style={{ flex:1,padding:"11px 6px",border:`2px solid ${pay.type===p.id?"#1e40af":"#e5e7eb"}`,borderRadius:10,background:pay.type===p.id?"#eff6ff":"#fff",fontWeight:600,fontSize:12,cursor:"pointer",color:pay.type===p.id?"#1e40af":"#6b7280" }}>{p.label}</button>
              ))}
            </div>
            {pay.type==="credit_card" && (
              <>
                <input placeholder="Card Number" value={pay.card} onChange={e=>setPay({...pay,card:e.target.value})} style={inp}/>
                <div style={{ display:"flex",gap:10 }}>
                  <input placeholder="MM/YY" value={pay.expiry} onChange={e=>setPay({...pay,expiry:e.target.value})} style={{...inp,flex:1}}/>
                  <input placeholder="CVV" value={pay.cvv} onChange={e=>setPay({...pay,cvv:e.target.value})} style={{...inp,width:80,flex:"none"}}/>
                </div>
                <select value={pay.inst} onChange={e=>setPay({...pay,inst:+e.target.value})} style={{...inp}}>
                  {[1,2,3,6,12].map(n=><option key={n} value={n}>{n}x of {fmtPrice(total/n)}</option>)}
                </select>
              </>
            )}
            {pay.type==="pix" && <div style={{ background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:12,padding:16,textAlign:"center",color:"#065f46",marginBottom:14 }}><p style={{ fontWeight:700,marginBottom:8 }}>PIX QR Code</p><div style={{ width:110,height:110,background:"#fff",border:"2px solid #e5e7eb",borderRadius:8,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#9ca3af" }}>QR Code</div><p style={{ fontSize:12,marginTop:8 }}>Scan with your bank app</p></div>}
            {pay.type==="boleto" && <div style={{ background:"#fefce8",border:"1px solid #fde68a",borderRadius:12,padding:14,color:"#92400e",marginBottom:14 }}><p style={{ fontWeight:700 }}>Boleto Bancário</p><p style={{ fontSize:13 }}>A boleto will be sent to your email. Valid for 3 business days.</p></div>}
            <div style={{ background:"#f9fafb",borderRadius:10,padding:14,marginBottom:16,fontSize:14 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6,color:"#6b7280" }}><span>Items ({cart.length})</span><span>{fmtPrice(cart.reduce((s,i)=>s+(parseFloat(i.price)||0)*i.qty,0))}</span></div>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10,color:"#6b7280" }}><span>Freight</span><span>{fmtPrice(cart.reduce((s,i)=>s+(parseFloat(i.freight_value)||0),0))}</span></div>
              <div style={{ display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:17,color:"#111827" }}><span>Total</span><span>{fmtPrice(total)}</span></div>
            </div>
            <button onClick={processPayment} disabled={processing} style={{ width:"100%",background:"#10b981",color:"#fff",border:"none",borderRadius:12,padding:14,fontWeight:700,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
              {processing ? <><div style={{ width:18,height:18,border:"3px solid rgba(255,255,255,0.3)",borderTop:"3px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/> Processing…</> : <><Icon name="card" size={17} color="#fff"/> Pay {fmtPrice(total)}</>}
            </button>
          </>
        )}

        {step===3 && (
          <div style={{ textAlign:"center",padding:"24px 0" }}>
            <div style={{ width:80,height:80,background:"#d1fae5",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px" }}>
              <Icon name="check" size={40} color="#10b981"/>
            </div>
            <h3 style={{ fontSize:24,fontWeight:800,color:"#111827",marginBottom:8 }}>Order Confirmed!</h3>
            <p style={{ color:"#6b7280",marginBottom:4 }}>Order #{Math.floor(100000+Math.random()*900000)}</p>
            <p style={{ color:"#6b7280",fontSize:13 }}>Estimated delivery: {3+Math.floor(Math.random()*7)} business days</p>
            <button onClick={onSuccess} style={{ background:"#1e40af",color:"#fff",border:"none",borderRadius:12,padding:"13px 40px",fontWeight:700,fontSize:15,cursor:"pointer",marginTop:20 }}>Continue Shopping</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI PANEL ─────────────────────────────────────────────────
function AIPanel({ products, cart, favorites, onClose }) {
  const [loading, setLoading] = useState(true);
  const [recs, setRecs] = useState(null);

  const getRecommendations = async () => {
    setLoading(true);
    try {
      const topCats = [...new Set(products.slice(0,20).map(p=>p.category_en||p.product_category_name))].slice(0,5);
      const cartNames = cart.map(c=>makeName(c.category_en,c.product_category_name,c.product_id));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:700,
          system:"You are an AI shopping assistant. Return only valid JSON, no markdown.",
          messages:[{role:"user",content:`Cart: ${cartNames.join(", ")||"empty"}. Top categories: ${topCats.join(", ")}. Give 3 product recommendations.\nJSON: {"recommendations":[{"category":"...","reason":"...","price_note":"..."}]}`}]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b=>b.text||"").join("")||"";
      setRecs(JSON.parse(text.replace(/```json|```/g,"").trim()).recommendations);
    } catch {
      setRecs([
        { category:"Health & Beauty", reason:"Popular among similar shoppers", price_note:"From R$ 50" },
        { category:"Electronics", reason:"High-demand items this season", price_note:"From R$ 200" },
        { category:"Sports & Leisure", reason:"Great deals available now", price_note:"From R$ 80" },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => { getRecommendations(); }, []);

  return (
    <div style={{ position:"fixed",bottom:20,right:20,zIndex:700,width:330,background:"#fff",borderRadius:18,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",border:"1px solid #e5e7eb",overflow:"hidden" }}>
      <div style={{ background:"linear-gradient(135deg,#1e40af,#3b82f6)",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,color:"#fff" }}>
          <Icon name="ai" size={18} color="#fff"/>
          <div><div style={{ fontWeight:700,fontSize:14 }}>AI Recommendations</div><div style={{ fontSize:11,opacity:0.8 }}>Powered by Claude</div></div>
        </div>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)",border:"none",borderRadius:"50%",width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}><Icon name="x" size={13} color="#fff"/></button>
      </div>
      <div style={{ padding:14 }}>
        {loading
          ? <div style={{ textAlign:"center",padding:20,color:"#6b7280" }}><div style={{ width:28,height:28,border:"3px solid #e5e7eb",borderTop:"3px solid #1e40af",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 10px" }}/> Analyzing preferences…</div>
          : <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
              {recs?.map((r,i) => (
                <div key={i} style={{ background:"#f8fafc",borderRadius:10,padding:11,border:"1px solid #e5e7eb" }}>
                  <div style={{ fontWeight:600,fontSize:13,color:"#111827",marginBottom:3 }}>{r.category}</div>
                  <div style={{ fontSize:12,color:"#6b7280",marginBottom:3 }}>{r.reason}</div>
                  <div style={{ fontSize:12,color:"#1e40af",fontWeight:600 }}>{r.price_note}</div>
                </div>
              ))}
              <button onClick={getRecommendations} style={{ background:"#f3f4f6",border:"none",borderRadius:8,padding:"9px",cursor:"pointer",fontWeight:600,fontSize:13,color:"#374151",display:"flex",alignItems:"center",justifyContent:"center",gap:5 }}>
                <Icon name="ai" size={13}/> Refresh
              </button>
            </div>
        }
      </div>
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("user");
  const [form, setForm] = useState({ email:"",password:"",name:"",phone:"",city:"",state:"" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState("");

  const sendOtp = () => {
    const code = Math.floor(100000+Math.random()*900000).toString();
    setOtp(code); setOtpSent(true);
    alert(`[DEMO] OTP for ${form.phone||form.email}: ${code}`);
  };

  const handleSubmit = async () => {
    setErr(""); setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    if (mode==="login") {
      const u = DEMO_USERS[form.email];
      if (!u || u.password!==form.password) { setErr("Invalid credentials"); setLoading(false); return; }
      onLogin({ ...u, email:form.email });
    } else {
      if (!form.email||!form.password||!form.name) { setErr("Fill all required fields"); setLoading(false); return; }
      if (otpSent && enteredOtp!==otp) { setErr("Wrong OTP"); setLoading(false); return; }
      onLogin({ role, name:form.name, email:form.email, id:"new_"+Date.now() });
    }
    setLoading(false);
  };

  const roles = [
    { id:"user",   label:"Customer", icon:"user",   color:"#3b82f6" },
    { id:"seller", label:"Seller",   icon:"store",  color:"#10b981" },
    { id:"admin",  label:"Admin",    icon:"shield", color:"#8b5cf6" },
  ];

  const inp = { padding:"12px 15px",border:"1.5px solid #e5e7eb",borderRadius:12,fontSize:14,outline:"none",width:"100%",boxSizing:"border-box" };

  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#1e3a8a 0%,#1e40af 50%,#3b82f6 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div style={{ width:"100%",maxWidth:460,background:"#fff",borderRadius:24,boxShadow:"0 25px 60px rgba(0,0,0,0.25)",padding:"40px 40px 32px",animation:"fadeUp 0.5s ease" }}>
        {/* Logo */}
        <div style={{ textAlign:"center",marginBottom:28 }}>
          <div style={{ width:56,height:56,background:"#1e40af",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
            <Icon name="store" size={28} color="#fff"/>
          </div>
          <h1 style={{ fontSize:26,fontWeight:900,color:"#111827",margin:0,letterSpacing:-0.5 }}>Onecart</h1>
          <p style={{ color:"#6b7280",marginTop:4,fontSize:13 }}>Brazil's Premier E-Commerce Platform</p>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex",background:"#f3f4f6",borderRadius:12,padding:4,marginBottom:22 }}>
          {["login","register"].map(m => (
            <button key={m} onClick={()=>setMode(m)} style={{ flex:1,padding:"10px",border:"none",borderRadius:10,background:mode===m?"#fff":"transparent",color:mode===m?"#1e40af":"#6b7280",fontWeight:mode===m?700:500,cursor:"pointer",transition:"all 0.2s",boxShadow:mode===m?"0 2px 8px rgba(0,0,0,0.1)":"none",fontSize:14 }}>
              {m==="login"?"Sign In":"Sign Up"}
            </button>
          ))}
        </div>

        {/* Role selector (register) */}
        {mode==="register" && (
          <div style={{ marginBottom:18 }}>
            <p style={{ fontSize:12,color:"#6b7280",marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:0.8 }}>Account Type</p>
            <div style={{ display:"flex",gap:8 }}>
              {roles.map(r => (
                <button key={r.id} onClick={()=>setRole(r.id)} style={{ flex:1,padding:"11px 6px",border:`2px solid ${role===r.id?r.color:"#e5e7eb"}`,borderRadius:12,background:role===r.id?r.color+"18":"#fff",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,transition:"all 0.2s" }}>
                  <Icon name={r.icon} size={19} color={role===r.id?r.color:"#9ca3af"}/>
                  <span style={{ fontSize:12,fontWeight:600,color:role===r.id?r.color:"#6b7280" }}>{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fields */}
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {mode==="register" && <input placeholder="Full Name *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp}/>}
          <input type="email" placeholder="Email Address *" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={inp}/>
          <input type="password" placeholder="Password *" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} style={inp}/>
          {mode==="register" && (
            <>
              <div style={{ display:"flex",gap:8 }}>
                <input placeholder="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} style={{...inp,flex:1}}/>
                <button onClick={sendOtp} style={{ padding:"0 14px",background:"#10b981",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontWeight:600,fontSize:13,whiteSpace:"nowrap" }}>Send OTP</button>
              </div>
              {otpSent && <input placeholder="Enter OTP" value={enteredOtp} onChange={e=>setEnteredOtp(e.target.value)} style={inp}/>}
              <div style={{ display:"flex",gap:8 }}>
                <input placeholder="City" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} style={{...inp,flex:1}}/>
                <input placeholder="State" value={form.state} onChange={e=>setForm({...form,state:e.target.value})} style={{...inp,width:80,flex:"none"}}/>
              </div>
            </>
          )}
        </div>

        {err && <div style={{ background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"10px 14px",color:"#dc2626",fontSize:13,marginTop:12,display:"flex",alignItems:"center",gap:8 }}><Icon name="alert" size={15} color="#dc2626"/>{err}</div>}

        <button onClick={handleSubmit} disabled={loading} style={{ width:"100%",background:"#1e40af",color:"#fff",border:"none",borderRadius:14,padding:15,fontWeight:700,fontSize:16,cursor:loading?"not-allowed":"pointer",marginTop:18,transition:"opacity 0.2s",opacity:loading?0.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
          {loading && <div style={{ width:18,height:18,border:"3px solid rgba(255,255,255,0.3)",borderTop:"3px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>}
          {mode==="login"?"Sign In →":"Create Account"}
        </button>

        <div style={{ marginTop:18,padding:14,background:"#f8fafc",borderRadius:12,fontSize:12,color:"#6b7280" }}>
          <p style={{ fontWeight:600,marginBottom:5,color:"#374151" }}>Demo Credentials:</p>
          <p>👤 user@demo.com / user123</p>
          <p>🏪 seller@demo.com / seller123</p>
          <p>🛡️ admin@demo.com / admin123</p>
        </div>
      </div>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        input, select, button, textarea { font-family: inherit; }
        select option { background: #fff; }
      `}</style>
    </div>
  );
}

// ─── USER DASHBOARD ───────────────────────────────────────────
function UserDashboard({ user, onLogout }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ total:0, page:1, limit:20 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("relevance");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type="success") => setToast({ message:msg, type });
  const totalPages = Math.ceil((pagination.total||0)/LIMIT);

  // Load categories
  useEffect(() => {
    fetch(`${API_BASE}/categories`)
      .then(r=>r.json())
      .then(d=>setCategories(Array.isArray(d)?d.filter(c=>c.category):[]))
      .catch(()=>{});
  }, []);

  // Load products from real API
  const loadProducts = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page, limit:LIMIT, sort });
    if (category!=="all") p.set("category", category);
    if (search) p.set("search", search);
    if (maxPrice) p.set("max_price", maxPrice);
    if (minRating>0) p.set("min_rating", minRating);
    fetch(`${API_BASE}/products?${p}`)
      .then(r=>r.json())
      .then(d=>{ if(d.products){setProducts(d.products);setPagination(d.pagination);} })
      .catch(()=>showToast("Cannot reach backend server","error"))
      .finally(()=>setLoading(false));
  }, [page, sort, category, search, maxPrice, minRating]);

  useEffect(()=>{ loadProducts(); }, [loadProducts]);

  const resetPage = fn => { fn(); setPage(1); };

  const addToCart = (product, qty=1) => {
    const idx = cart.findIndex(i=>i.product_id===product.product_id);
    if (idx>=0) { const c=[...cart]; c[idx].qty+=qty; setCart(c); }
    else setCart([...cart,{...product,qty}]);
    showToast(`${makeName(product.category_en,product.product_category_name,product.product_id)} added to cart!`);
  };

  const toggleFav = id => setFavorites(prev => prev.includes(id)?prev.filter(f=>f!==id):[...prev,id]);

  const updateCartQty = (idx, qty) => {
    if (qty<=0) { const c=[...cart]; c.splice(idx,1); setCart(c); }
    else { const c=[...cart]; c[idx].qty=qty; setCart(c); }
  };

  const sidebarLabel = { fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:1,marginBottom:10 };

  return (
    <div style={{ minHeight:"100vh",background:"#f8fafc" }}>
      {/* NAVBAR */}
      <nav style={{ background:"#fff",boxShadow:"0 1px 20px rgba(0,0,0,0.07)",position:"sticky",top:0,zIndex:600,padding:"0 24px",height:64,display:"flex",alignItems:"center",gap:14 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,fontWeight:900,fontSize:20,color:"#1e40af",marginRight:12,flexShrink:0 }}>
          <Icon name="store" size={22} color="#1e40af"/>Onecart
        </div>
        <div style={{ flex:1,display:"flex",maxWidth:500 }}>
          <input value={searchInput} onChange={e=>setSearchInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") resetPage(()=>setSearch(searchInput)); }}
            placeholder="Search products, categories..."
            style={{ flex:1,padding:"9px 14px",border:"1.5px solid #e5e7eb",borderRadius:"10px 0 0 10px",fontSize:14,outline:"none" }}/>
          <button onClick={()=>resetPage(()=>setSearch(searchInput))} style={{ background:"#1e40af",color:"#fff",border:"none",borderRadius:"0 10px 10px 0",padding:"0 14px",cursor:"pointer" }}>
            <Icon name="search" size={17} color="#fff"/>
          </button>
        </div>
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:10 }}>
          <button onClick={()=>setShowAI(!showAI)} style={{ background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"8px 13px",cursor:"pointer",color:"#1e40af",fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:6 }}>
            <Icon name="ai" size={15} color="#1e40af"/>AI
          </button>
          <button onClick={()=>setShowCart(true)} style={{ position:"relative",background:"#f3f4f6",border:"none",borderRadius:10,padding:"9px 13px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontWeight:600,fontSize:13 }}>
            <Icon name="cart" size={18}/>
            {cart.length>0 && <span style={{ position:"absolute",top:-4,right:-4,background:"#ef4444",color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center" }}>{cart.reduce((s,i)=>s+i.qty,0)}</span>}
          </button>
          <div style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 12px",background:"#f3f4f6",borderRadius:10 }}>
            <div style={{ width:28,height:28,borderRadius:"50%",background:"#1e40af",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:12 }}>{user.name?.[0]||"U"}</div>
            <span style={{ fontWeight:600,fontSize:13,color:"#374151" }}>{user.name}</span>
          </div>
          <button onClick={onLogout} style={{ background:"none",border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 13px",cursor:"pointer",color:"#6b7280",display:"flex",alignItems:"center",gap:5,fontSize:13 }}>
            <Icon name="logout" size={15}/>Logout
          </button>
        </div>
      </nav>

      <div style={{ display:"flex",padding:"22px",gap:22,maxWidth:1400,margin:"0 auto" }}>
        {/* SIDEBAR */}
        <div style={{ width:250,flexShrink:0 }}>
          <div style={{ background:"#fff",borderRadius:16,padding:18,boxShadow:"0 2px 12px rgba(0,0,0,0.05)",display:"flex",flexDirection:"column",gap:20 }}>
            {/* Categories */}
            <div>
              <p style={sidebarLabel}>Categories</p>
              <div style={{ display:"flex",flexDirection:"column",gap:2,maxHeight:220,overflowY:"auto" }}>
                {[{category:"all",count:pagination.total},...categories].map(c=>{
                  const active = category===(c.category);
                  return (
                    <button key={c.category} onClick={()=>resetPage(()=>setCategory(c.category))}
                      style={{ width:"100%",background:active?"#eff6ff":"transparent",border:"none",borderRadius:8,padding:"7px 10px",textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,fontWeight:active?600:400,color:active?"#1e40af":"#374151" }}>
                      <span style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.category==="all"?"All Categories":c.category.replace(/_/g," ")}</span>
                      <span style={{ fontSize:11,color:"#9ca3af",flexShrink:0 }}>{c.count||""}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price */}
            <div>
              <p style={sidebarLabel}>Max Price (R$)</p>
              <input type="number" placeholder="e.g. 500" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)}
                style={{ width:"100%",padding:"9px 12px",border:"1.5px solid #e5e7eb",borderRadius:10,fontSize:13,outline:"none" }}/>
              <button onClick={()=>resetPage(()=>{})} style={{ width:"100%",marginTop:7,background:"#1e40af",color:"#fff",border:"none",borderRadius:8,padding:"8px",fontSize:12,fontWeight:600,cursor:"pointer" }}>Apply</button>
              {maxPrice && <button onClick={()=>resetPage(()=>setMaxPrice(""))} style={{ width:"100%",marginTop:5,background:"transparent",border:"1px solid #e5e7eb",borderRadius:8,color:"#6b7280",padding:"7px",fontSize:12,cursor:"pointer" }}>Clear</button>}
            </div>

            {/* Rating */}
            <div>
              <p style={sidebarLabel}>Min. Rating</p>
              <div style={{ display:"flex",gap:5 }}>
                {[0,3,4,4.5].map(r => (
                  <button key={r} onClick={()=>resetPage(()=>setMinRating(r))}
                    style={{ flex:1,padding:"6px 4px",border:`1.5px solid ${minRating===r?"#1e40af":"#e5e7eb"}`,borderRadius:8,background:minRating===r?"#eff6ff":"#fff",cursor:"pointer",fontSize:11,fontWeight:600,color:minRating===r?"#1e40af":"#6b7280" }}>
                    {r===0?"All":`${r}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <p style={sidebarLabel}>Sort By</p>
              {[["relevance","Most Relevant"],["price_asc","Price ↑"],["price_desc","Price ↓"],["rating","Top Rated"],["newest","Newest"]].map(([v,l])=>(
                <button key={v} onClick={()=>resetPage(()=>setSort(v))}
                  style={{ width:"100%",background:sort===v?"#eff6ff":"transparent",border:"none",borderRadius:8,padding:"7px 10px",textAlign:"left",cursor:"pointer",fontSize:13,fontWeight:sort===v?600:400,color:sort===v?"#1e40af":"#374151",marginBottom:2 }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN */}
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18 }}>
            <div>
              <h2 style={{ fontSize:21,fontWeight:800,color:"#111827",margin:0 }}>
                {category==="all"?"All Products":category.replace(/_/g," ")}
              </h2>
              <p style={{ color:"#6b7280",fontSize:13,marginTop:3 }}>
                {loading?"Loading…":`${pagination.total?.toLocaleString()||0} products · Page ${page} of ${totalPages}`}
              </p>
            </div>
            {(search||category!=="all"||maxPrice||minRating>0) && (
              <button onClick={()=>{setSearch("");setSearchInput("");setCategory("all");setMaxPrice("");setMinRating(0);setPage(1);}}
                style={{ background:"#f3f4f6",border:"none",borderRadius:10,padding:"8px 14px",cursor:"pointer",color:"#6b7280",fontSize:13,display:"flex",alignItems:"center",gap:5 }}>
                <Icon name="x" size={13}/>Clear filters
              </button>
            )}
          </div>

          {/* Skeleton / Grid */}
          {loading ? (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:18 }}>
              {Array.from({length:LIMIT}).map((_,i)=>(
                <div key={i} style={{ borderRadius:16,height:310,background:"linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",backgroundSize:"400px 100%",animation:"shimmer 1.4s infinite" }}/>
              ))}
            </div>
          ) : products.length===0 ? (
            <div style={{ textAlign:"center",padding:"70px 0",color:"#9ca3af" }}>
              <Icon name="search" size={48} color="#d1d5db"/>
              <p style={{ marginTop:14,fontSize:17,fontWeight:600 }}>No products found</p>
              <p style={{ fontSize:13 }}>Try adjusting your filters</p>
            </div>
          ) : (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:18 }}>
              {products.map(p=>(
                <ProductCard key={p.product_id} product={p} onAddCart={addToCart} onFavorite={toggleFav} favorites={favorites} onClick={setSelectedProduct}/>
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onPage={setPage}/>
          {totalPages>1 && !loading && <p style={{ textAlign:"center",color:"#9ca3af",fontSize:12,marginTop:8 }}>Page {page} of {totalPages.toLocaleString()}</p>}
        </div>
      </div>

      {selectedProduct && <ProductModal product={selectedProduct} onClose={()=>setSelectedProduct(null)} onAddCart={addToCart} user={user}/>}
      {showCart && <CartSidebar cart={cart} onClose={()=>setShowCart(false)} onUpdateQty={updateCartQty} onRemove={i=>{const c=[...cart];c.splice(i,1);setCart(c)}} onCheckout={()=>{setShowCart(false);setShowCheckout(true)}}/>}
      {showCheckout && <CheckoutModal cart={cart} onClose={()=>setShowCheckout(false)} onSuccess={()=>{setCart([]);setShowCheckout(false);showToast("Order placed successfully!","success")}}/>}
      {showAI && <AIPanel products={products} cart={cart} favorites={favorites} onClose={()=>setShowAI(false)}/>}
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}

// ─── SELLER DASHBOARD ─────────────────────────────────────────
function SellerDashboard({ user, onLogout }) {
  const MOCK_PRODUCTS = Array.from({length:8},(_,i)=>({
    product_id:`prod_${i+1}`,
    category_en:["Health Beauty","Electronics","Sports","Furniture","Toys","Books","Clothing","Pets"][i],
    price:+(80+Math.random()*400).toFixed(2),
    stock:Math.floor(Math.random()*80),
    rating:+(3.5+Math.random()*1.5).toFixed(1),
    review_count:Math.floor(Math.random()*200),
  }));
  const [tab, setTab] = useState("inventory");
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [showAdd, setShowAdd] = useState(false);
  const [newProd, setNewProd] = useState({ name:"",category:"",price:"",stock:"" });
  const [toast, setToast] = useState(null);
  const lowStock = products.filter(p=>p.stock<15);
  const orders = [
    { id:"ORD-001",product:"Health Beauty #A1B2C",customer:"Maria Silva",city:"São Paulo",status:"pending",value:129.90,date:"2024-01-15" },
    { id:"ORD-002",product:"Electronics #D3E4F",customer:"João Santos",city:"Rio de Janeiro",status:"shipped",value:299.00,date:"2024-01-14" },
    { id:"ORD-003",product:"Sports #G5H6I",customer:"Ana Costa",city:"Belo Horizonte",status:"delivered",value:89.50,date:"2024-01-13" },
  ];

  const tabs = [
    { id:"inventory",label:"Inventory",icon:"pkg" },
    { id:"orders",label:"Orders",icon:"truck" },
    { id:"analytics",label:"Analytics",icon:"chart" },
    { id:"alerts",label:`Alerts${lowStock.length?` (${lowStock.length})`:""}`,icon:"bell" },
  ];

  const addProduct = () => {
    if (!newProd.name||!newProd.price) return;
    setProducts([...products,{ product_id:`prod_new_${Date.now()}`,category_en:newProd.category,price:+newProd.price,stock:+newProd.stock||0,rating:0,review_count:0 }]);
    setShowAdd(false); setNewProd({ name:"",category:"",price:"",stock:"" });
    setToast({ message:"Product added!",type:"success" });
  };

  return (
    <div style={{ minHeight:"100vh",background:"#f8fafc" }}>
      <nav style={{ background:"#065f46",padding:"0 24px",height:64,display:"flex",alignItems:"center",gap:14 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,fontWeight:900,fontSize:19,color:"#fff",marginRight:16 }}>
          <Icon name="store" size={22} color="#fff"/>Seller Hub
        </div>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:tab===t.id?"rgba(255,255,255,0.2)":"none",border:"none",color:"#fff",padding:"8px 13px",borderRadius:10,cursor:"pointer",fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:5 }}>
            <Icon name={t.icon} size={15} color="#fff"/>{t.label}
          </button>
        ))}
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:12 }}>
          <span style={{ color:"rgba(255,255,255,0.8)",fontSize:13 }}>🏪 {user.name}</span>
          <button onClick={onLogout} style={{ background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",padding:"8px 13px",borderRadius:10,cursor:"pointer",fontWeight:600,fontSize:13 }}>Logout</button>
        </div>
      </nav>

      <div style={{ padding:26,maxWidth:1200,margin:"0 auto" }}>
        {tab==="inventory" && (
          <>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22 }}>
              <h2 style={{ fontSize:22,fontWeight:800,margin:0 }}>My Products</h2>
              <button onClick={()=>setShowAdd(true)} style={{ background:"#065f46",color:"#fff",border:"none",borderRadius:12,padding:"11px 18px",cursor:"pointer",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:7 }}>
                <Icon name="plus" size={16} color="#fff"/>Add Product
              </button>
            </div>
            <div style={{ background:"#fff",borderRadius:16,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead><tr style={{ background:"#f9fafb",borderBottom:"1px solid #e5e7eb" }}>
                  {["Product","Category","Price","Stock","Rating","Actions"].map(h=><th key={h} style={{ padding:"13px 15px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:0.5 }}>{h}</th>)}
                </tr></thead>
                <tbody>{products.map(p=>(
                  <tr key={p.product_id} style={{ borderBottom:"1px solid #f3f4f6" }}>
                    <td style={{ padding:"13px 15px",fontWeight:600,fontSize:14,color:"#111827" }}>{makeName(p.category_en,"",p.product_id)}</td>
                    <td style={{ padding:"13px 15px",fontSize:13,color:"#6b7280" }}>{(p.category_en||"").replace(/_/g," ")}</td>
                    <td style={{ padding:"13px 15px",fontWeight:700,color:"#1e40af",fontSize:14 }}>{fmtPrice(p.price)}</td>
                    <td style={{ padding:"13px 15px" }}><span style={{ background:p.stock<15?"#fef2f2":p.stock<30?"#fefce8":"#f0fdf4",color:p.stock<15?"#dc2626":p.stock<30?"#ca8a04":"#16a34a",padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600 }}>{p.stock} units</span></td>
                    <td style={{ padding:"13px 15px" }}><StarRating rating={p.rating}/></td>
                    <td style={{ padding:"13px 15px" }}><div style={{ display:"flex",gap:7 }}><button style={{ background:"#eff6ff",border:"none",borderRadius:8,padding:"7px",cursor:"pointer" }}><Icon name="edit" size={13} color="#1e40af"/></button><button style={{ background:"#fef2f2",border:"none",borderRadius:8,padding:"7px",cursor:"pointer" }}><Icon name="trash" size={13} color="#ef4444"/></button></div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}

        {tab==="orders" && (
          <>
            <h2 style={{ fontSize:22,fontWeight:800,marginBottom:22 }}>Incoming Orders</h2>
            <div style={{ display:"flex",flexDirection:"column",gap:13 }}>
              {orders.map(o=>(
                <div key={o.id} style={{ background:"#fff",borderRadius:16,padding:18,boxShadow:"0 2px 12px rgba(0,0,0,0.05)",display:"flex",alignItems:"center",gap:14 }}>
                  <div style={{ width:46,height:46,background:"#f0fdf4",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center" }}><Icon name="pkg" size={22} color="#16a34a"/></div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700,fontSize:15,color:"#111827" }}>{o.id} — {o.product}</div>
                    <div style={{ fontSize:13,color:"#6b7280",marginTop:2 }}>Customer: {o.customer} · {o.city}</div>
                    <div style={{ fontSize:12,color:"#9ca3af",marginTop:2 }}>{o.date}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontWeight:800,fontSize:17,color:"#065f46" }}>{fmtPrice(o.value)}</div>
                    <span style={{ background:o.status==="delivered"?"#f0fdf4":o.status==="shipped"?"#eff6ff":"#fefce8",color:o.status==="delivered"?"#16a34a":o.status==="shipped"?"#1e40af":"#ca8a04",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600 }}>{o.status}</span>
                  </div>
                  <button style={{ background:"#1e40af",color:"#fff",border:"none",borderRadius:10,padding:"9px 14px",cursor:"pointer",fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:5 }}>
                    <Icon name="truck" size={13} color="#fff"/>Ship
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab==="analytics" && (
          <>
            <h2 style={{ fontSize:22,fontWeight:800,marginBottom:22 }}>Sales Analytics</h2>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22 }}>
              {[{label:"Revenue",value:"R$ 12,450",icon:"chart",color:"#1e40af"},{label:"Orders",value:"47",icon:"pkg",color:"#10b981"},{label:"Avg Rating",value:"4.2 ★",icon:"star",color:"#f59e0b"},{label:"Products",value:products.length,icon:"store",color:"#8b5cf6"}].map(s=>(
                <div key={s.label} style={{ background:"#fff",borderRadius:14,padding:18,boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                    <div style={{ width:36,height:36,borderRadius:10,background:s.color+"22",display:"flex",alignItems:"center",justifyContent:"center" }}><Icon name={s.icon} size={18} color={s.color}/></div>
                    <span style={{ fontSize:12,color:"#6b7280" }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize:24,fontWeight:800,color:"#111827" }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background:"#fff",borderRadius:14,padding:22,boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
              <h3 style={{ fontSize:15,fontWeight:700,marginBottom:18 }}>Monthly Revenue</h3>
              <div style={{ display:"flex",alignItems:"flex-end",gap:8,height:140 }}>
                {[4200,5100,4800,6200,5900,7100,6800,8200,7500,9100,8400,12450].map((v,i)=>(
                  <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5 }}>
                    <div style={{ width:"100%",background:"linear-gradient(180deg,#3b82f6,#1e40af)",borderRadius:"5px 5px 0 0",height:`${(v/12450)*130}px` }}/>
                    <span style={{ fontSize:9,color:"#9ca3af" }}>{"JFMAMJJASOND"[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab==="alerts" && (
          <>
            <h2 style={{ fontSize:22,fontWeight:800,marginBottom:22 }}>Stock Alerts</h2>
            {lowStock.length===0
              ? <div style={{ background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:16,padding:24,textAlign:"center",color:"#065f46" }}><Icon name="check" size={36} color="#10b981"/><p style={{ fontWeight:700,marginTop:10 }}>All stocks healthy!</p></div>
              : <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                  {lowStock.map(p=>(
                    <div key={p.product_id} style={{ background:"#fff",borderRadius:14,padding:18,boxShadow:"0 2px 12px rgba(0,0,0,0.05)",border:`2px solid ${p.stock<5?"#fecaca":"#fde68a"}`,display:"flex",alignItems:"center",gap:14 }}>
                      <div style={{ width:42,height:42,borderRadius:12,background:p.stock<5?"#fef2f2":"#fefce8",display:"flex",alignItems:"center",justifyContent:"center" }}><Icon name="alert" size={20} color={p.stock<5?"#dc2626":"#d97706"}/></div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700,fontSize:14,color:"#111827" }}>{makeName(p.category_en,"",p.product_id)}</div>
                        <div style={{ fontSize:12,color:"#6b7280" }}>{fmtPrice(p.price)}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:22,fontWeight:800,color:p.stock<5?"#dc2626":"#d97706" }}>{p.stock}</div>
                        <div style={{ fontSize:11,color:"#6b7280" }}>units left</div>
                      </div>
                      <button style={{ background:"#1e40af",color:"#fff",border:"none",borderRadius:10,padding:"9px 14px",cursor:"pointer",fontWeight:600,fontSize:13 }}>Restock</button>
                    </div>
                  ))}
                </div>
            }
          </>
        )}
      </div>

      {showAdd && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div style={{ background:"#fff",borderRadius:20,padding:30,width:"100%",maxWidth:440 }}>
            <h2 style={{ marginBottom:20,fontWeight:800,fontSize:19 }}>Add New Product</h2>
            {[["name","Product Name"],["category","Category"],["price","Price (R$)"],["stock","Stock Quantity"]].map(([k,pl])=>(
              <input key={k} placeholder={pl} value={newProd[k]} onChange={e=>setNewProd({...newProd,[k]:e.target.value})}
                style={{ width:"100%",padding:"12px 14px",border:"1.5px solid #e5e7eb",borderRadius:10,fontSize:14,marginBottom:10,boxSizing:"border-box",outline:"none" }}/>
            ))}
            <div style={{ display:"flex",gap:10,marginTop:10 }}>
              <button onClick={()=>setShowAdd(false)} style={{ flex:1,padding:13,border:"1.5px solid #e5e7eb",borderRadius:12,background:"#fff",cursor:"pointer",fontWeight:600 }}>Cancel</button>
              <button onClick={addProduct} style={{ flex:1,padding:13,background:"#065f46",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontWeight:700 }}>Add Product</button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────
function AdminDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [editModal, setEditModal] = useState(null);
  const [toast, setToast] = useState(null);

  const stats = [
    { label:"Total Revenue",value:"R$ 13,591,644",change:"+12.3%",icon:"chart",color:"#1e40af" },
    { label:"Total Orders",value:"99,441",change:"+8.7%",icon:"pkg",color:"#10b981" },
    { label:"Active Customers",value:"96,096",change:"+5.2%",icon:"user",color:"#8b5cf6" },
    { label:"Active Sellers",value:"3,095",change:"+2.1%",icon:"store",color:"#f59e0b" },
  ];
  const customers = [
    { id:"c1",name:"Maria Silva",email:"maria@email.com",city:"São Paulo",orders:12,spent:"R$ 2,340",status:"active" },
    { id:"c2",name:"João Santos",email:"joao@email.com",city:"Rio de Janeiro",orders:7,spent:"R$ 890",status:"active" },
    { id:"c3",name:"Ana Costa",email:"ana@email.com",city:"Curitiba",orders:3,spent:"R$ 450",status:"inactive" },
  ];
  const sellers = [
    { id:"s1",name:"TechStore SP",email:"tech@store.com",city:"São Paulo",products:45,revenue:"R$ 124,500",rating:4.7,status:"active" },
    { id:"s2",name:"Fashion House",email:"fashion@house.com",city:"Rio de Janeiro",products:123,revenue:"R$ 89,200",rating:4.2,status:"active" },
  ];
  const tabs = [
    { id:"overview",label:"Overview",icon:"chart" },
    { id:"customers",label:"Customers",icon:"user" },
    { id:"sellers",label:"Sellers",icon:"store" },
    { id:"settings",label:"Settings",icon:"settings" },
  ];

  const th = { padding:"13px 15px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:0.5 };
  const td = { padding:"13px 15px" };

  return (
    <div style={{ minHeight:"100vh",background:"#f1f5f9" }}>
      <nav style={{ background:"#1e1b4b",padding:"0 24px",height:64,display:"flex",alignItems:"center",gap:10 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,fontWeight:900,fontSize:19,color:"#fff",marginRight:14 }}>
          <Icon name="shield" size={22} color="#a5b4fc"/>Admin Panel
        </div>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:tab===t.id?"rgba(165,180,252,0.2)":"none",border:tab===t.id?"1px solid rgba(165,180,252,0.4)":"1px solid transparent",color:tab===t.id?"#a5b4fc":"rgba(255,255,255,0.6)",padding:"8px 13px",borderRadius:10,cursor:"pointer",fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:5,transition:"all 0.2s" }}>
            <Icon name={t.icon} size={14} color={tab===t.id?"#a5b4fc":"rgba(255,255,255,0.5)"}/>{t.label}
          </button>
        ))}
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:12 }}>
          <span style={{ color:"rgba(255,255,255,0.7)",fontSize:13 }}>🛡️ {user.name}</span>
          <button onClick={onLogout} style={{ background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",padding:"8px 13px",borderRadius:10,cursor:"pointer",fontWeight:600,fontSize:13 }}>Logout</button>
        </div>
      </nav>

      <div style={{ padding:26,maxWidth:1400,margin:"0 auto" }}>
        {tab==="overview" && (
          <>
            <h2 style={{ fontSize:23,fontWeight:800,marginBottom:22,color:"#111827" }}>Platform Overview</h2>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24 }}>
              {stats.map(s=>(
                <div key={s.label} style={{ background:"#fff",borderRadius:15,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
                    <div style={{ width:42,height:42,borderRadius:11,background:s.color+"18",display:"flex",alignItems:"center",justifyContent:"center" }}><Icon name={s.icon} size={20} color={s.color}/></div>
                    <span style={{ background:"#f0fdf4",color:"#16a34a",padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:700 }}>{s.change}</span>
                  </div>
                  <div style={{ fontSize:26,fontWeight:800,color:"#111827",marginBottom:3 }}>{s.value}</div>
                  <div style={{ fontSize:12,color:"#6b7280" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:18 }}>
              <div style={{ background:"#fff",borderRadius:15,padding:22,boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
                <h3 style={{ fontSize:15,fontWeight:700,marginBottom:18 }}>Revenue Trend</h3>
                <div style={{ display:"flex",alignItems:"flex-end",gap:6,height:130 }}>
                  {[8200,9100,8700,10200,9800,11500,10900,13200,12100,14800,13600,15900].map((v,i)=>(
                    <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4 }}>
                      <div style={{ width:"100%",background:`linear-gradient(180deg,${i%2?"#6366f1":"#8b5cf6"},#1e1b4b)`,borderRadius:"4px 4px 0 0",height:`${(v/15900)*120}px` }}/>
                      <span style={{ fontSize:9,color:"#9ca3af" }}>{"JFMAMJJASOND"[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background:"#fff",borderRadius:15,padding:22,boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
                <h3 style={{ fontSize:15,fontWeight:700,marginBottom:18 }}>Top Categories</h3>
                {[{name:"Health & Beauty",pct:23,color:"#3b82f6"},{name:"Computers & Acc.",pct:18,color:"#8b5cf6"},{name:"Sports & Leisure",pct:14,color:"#10b981"},{name:"Furniture",pct:12,color:"#f59e0b"},{name:"Others",pct:33,color:"#e5e7eb"}].map(c=>(
                  <div key={c.name} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}><span style={{ fontSize:12,color:"#374151" }}>{c.name}</span><span style={{ fontSize:12,fontWeight:700,color:"#111827" }}>{c.pct}%</span></div>
                    <div style={{ height:5,background:"#f3f4f6",borderRadius:10 }}><div style={{ height:"100%",width:`${c.pct}%`,background:c.color,borderRadius:10 }}/></div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab==="customers" && (
          <>
            <h2 style={{ fontSize:22,fontWeight:800,marginBottom:22 }}>Customer Management</h2>
            <div style={{ background:"#fff",borderRadius:15,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead><tr style={{ background:"#f9fafb",borderBottom:"1px solid #e5e7eb" }}>
                  {["Customer","Email","City","Orders","Total Spent","Status","Actions"].map(h=><th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>{customers.map(c=>(
                  <tr key={c.id} style={{ borderBottom:"1px solid #f3f4f6" }}>
                    <td style={td}><div style={{ display:"flex",alignItems:"center",gap:9 }}><div style={{ width:34,height:34,borderRadius:"50%",background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:"#1e40af" }}>{c.name[0]}</div><span style={{ fontWeight:600,fontSize:14 }}>{c.name}</span></div></td>
                    <td style={{ ...td,fontSize:13,color:"#6b7280" }}>{c.email}</td>
                    <td style={{ ...td,fontSize:13,color:"#6b7280" }}>{c.city}</td>
                    <td style={{ ...td,fontSize:14,fontWeight:600 }}>{c.orders}</td>
                    <td style={{ ...td,fontWeight:700,color:"#1e40af",fontSize:14 }}>{c.spent}</td>
                    <td style={td}><span style={{ background:c.status==="active"?"#f0fdf4":"#f9fafb",color:c.status==="active"?"#16a34a":"#9ca3af",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600 }}>{c.status}</span></td>
                    <td style={td}><div style={{ display:"flex",gap:5 }}><button onClick={()=>setEditModal({type:"customer",data:c})} style={{ background:"#eff6ff",border:"none",borderRadius:8,padding:"6px",cursor:"pointer" }}><Icon name="edit" size={13} color="#1e40af"/></button><button style={{ background:"#fef2f2",border:"none",borderRadius:8,padding:"6px",cursor:"pointer" }}><Icon name="eye" size={13} color="#ef4444"/></button></div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}

        {tab==="sellers" && (
          <>
            <h2 style={{ fontSize:22,fontWeight:800,marginBottom:22 }}>Seller Management</h2>
            <div style={{ background:"#fff",borderRadius:15,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead><tr style={{ background:"#f9fafb",borderBottom:"1px solid #e5e7eb" }}>
                  {["Seller","Email","City","Products","Revenue","Rating","Status","Actions"].map(h=><th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>{sellers.map(s=>(
                  <tr key={s.id} style={{ borderBottom:"1px solid #f3f4f6" }}>
                    <td style={td}><div style={{ display:"flex",alignItems:"center",gap:9 }}><div style={{ width:34,height:34,borderRadius:10,background:"#f0fdf4",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:"#065f46" }}>{s.name[0]}</div><span style={{ fontWeight:600,fontSize:14 }}>{s.name}</span></div></td>
                    <td style={{ ...td,fontSize:13,color:"#6b7280" }}>{s.email}</td>
                    <td style={{ ...td,fontSize:13,color:"#6b7280" }}>{s.city}</td>
                    <td style={{ ...td,fontSize:14,fontWeight:600 }}>{s.products}</td>
                    <td style={{ ...td,fontWeight:700,color:"#065f46",fontSize:14 }}>{s.revenue}</td>
                    <td style={td}><StarRating rating={s.rating}/></td>
                    <td style={td}><span style={{ background:"#f0fdf4",color:"#16a34a",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600 }}>{s.status}</span></td>
                    <td style={td}><div style={{ display:"flex",gap:5 }}><button onClick={()=>setEditModal({type:"seller",data:s})} style={{ background:"#eff6ff",border:"none",borderRadius:8,padding:"6px",cursor:"pointer" }}><Icon name="edit" size={13} color="#1e40af"/></button><button style={{ background:"#fef2f2",border:"none",borderRadius:8,padding:"6px",cursor:"pointer" }}><Icon name="trash" size={13} color="#ef4444"/></button></div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}

        {tab==="settings" && (
          <>
            <h2 style={{ fontSize:22,fontWeight:800,marginBottom:22 }}>Platform Settings</h2>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:18 }}>
              {[
                { title:"Database Connection",desc:"MySQL localhost:3306/olist_ecommerce",icon:"pkg",status:"Connected" },
                { title:"Email Service",desc:"SMTP configured for notifications",icon:"bell",status:"Active" },
                { title:"ML Models",desc:"Price prediction & recommendation models",icon:"ai",status:"Running" },
                { title:"Payment Gateway",desc:"Demo Stripe integration configured",icon:"card",status:"Sandbox" },
              ].map(s=>(
                <div key={s.title} style={{ background:"#fff",borderRadius:15,padding:18,boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:11,marginBottom:12 }}>
                    <div style={{ width:42,height:42,borderRadius:12,background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center" }}><Icon name={s.icon} size={20} color="#374151"/></div>
                    <div><div style={{ fontWeight:700,fontSize:14,color:"#111827" }}>{s.title}</div><div style={{ fontSize:12,color:"#6b7280" }}>{s.desc}</div></div>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <span style={{ background:"#f0fdf4",color:"#16a34a",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600 }}>{s.status}</span>
                    <button style={{ background:"#eff6ff",border:"none",borderRadius:8,padding:"7px 12px",cursor:"pointer",color:"#1e40af",fontWeight:600,fontSize:12 }}>Configure</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {editModal && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div style={{ background:"#fff",borderRadius:20,padding:30,width:"100%",maxWidth:460 }}>
            <h2 style={{ marginBottom:18,fontWeight:800,fontSize:19 }}>Edit {editModal.type==="customer"?"Customer":"Seller"}</h2>
            {Object.entries(editModal.data).filter(([k])=>k!=="id").map(([k,v])=>(
              <div key={k} style={{ marginBottom:10 }}>
                <label style={{ fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",display:"block",marginBottom:3 }}>{k}</label>
                <input defaultValue={v} style={{ width:"100%",padding:"10px 13px",border:"1.5px solid #e5e7eb",borderRadius:9,fontSize:14,boxSizing:"border-box",outline:"none" }}/>
              </div>
            ))}
            <div style={{ display:"flex",gap:10,marginTop:18 }}>
              <button onClick={()=>setEditModal(null)} style={{ flex:1,padding:13,border:"1.5px solid #e5e7eb",borderRadius:12,background:"#fff",cursor:"pointer",fontWeight:600 }}>Cancel</button>
              <button onClick={()=>{setEditModal(null);setToast({message:"Changes saved!",type:"success"});}} style={{ flex:1,padding:13,background:"#1e1b4b",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontWeight:700 }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  if (!user) return <LoginPage onLogin={setUser}/>;
  if (user.role==="seller") return <SellerDashboard user={user} onLogout={()=>setUser(null)}/>;
  if (user.role==="admin")  return <AdminDashboard  user={user} onLogout={()=>setUser(null)}/>;
  return <UserDashboard user={user} onLogout={()=>setUser(null)}/>;
}
