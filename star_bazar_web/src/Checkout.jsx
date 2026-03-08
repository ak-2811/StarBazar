import { useState, useEffect } from 'react'
import React from 'react'
import './Checkout.css'
// import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import axios from 'axios'

function Checkout({ onNavigate, onClearCart }) {

  // const location = useLocation();
  const navigate= useNavigate();

const [productsFromServer, setProductsFromServer] = useState([]);
useEffect(() => {

  const cart = JSON.parse(localStorage.getItem("cart")) || {};
  const itemCodes = Object.keys(cart);

  if (itemCodes.length === 0) return;

  axios.post(
    "http://localhost:8000/api/products-by-codes/",
    { item_codes: itemCodes }
  )
  .then(res => {
    setProductsFromServer(res.data.products);
  })
  .catch(err => console.log(err));

}, []);

const productMap = {};
productsFromServer.forEach(p => {
  productMap[p.item_code] = p;
});


// Get cart object from localStorage and keep it in state so UI updates when qty changes
const [cartObject, setCartObject] = useState(() => JSON.parse(localStorage.getItem("cart")) || {});

// keep localStorage in sync if other tabs modify it
useEffect(() => {
  const handler = () => {
    try {
      setCartObject(JSON.parse(localStorage.getItem('cart')) || {});
    } catch (e) {
      setCartObject({});
      console.log(e)
    }
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}, [])

const [offers, setOffers] = useState([]);
useEffect(() => {

  axios.get("http://localhost:8000/api/pricing-offers/")
  .then(res => {
    setOffers(res.data)
  })
  .catch(err => console.log(err))

}, [])
// const offers = location.state?.offers || [];

// Convert object → array (REAL cart)
// const cart = Object.values(cartObject);
// const cart = Object.values(cartObject).map(cartItem => {

//   const latestProduct = productMap[cartItem.item.item_code];

//   if (!latestProduct) return cartItem;

//   return {
//     ...cartItem,
//     item: latestProduct
//   };

// });

const cart = Object.values(cartObject)
  .map(cartItem => {

    const latestProduct = productMap[cartItem.item.item_code];

    if (!latestProduct) return null;

    const availableStock = latestProduct.stock;

    if (availableStock <= 0) {
      console.log("Removing out-of-stock item:", latestProduct.item_name);
      return null;
    }

    let adjustedQty = cartItem.qty;

    if (adjustedQty > availableStock) {
      console.log("Reducing qty due to stock:", latestProduct.item_name);
      adjustedQty = availableStock;
    }

    return {
      ...cartItem,
      qty: adjustedQty,
      item: latestProduct
    };

  })
  .filter(Boolean);

  // updating the cart in local
useEffect(() => {

  const newCart = {};

  cart.forEach(item => {
    newCart[item.item.item_code] = {
      item: item.item,
      qty: item.qty
    };
  });

  localStorage.setItem("cart", JSON.stringify(newCart));

}, [cart,productsFromServer]);


// 🔥 Apply offer logic
const updatedCart = cart.map(cartItem => {

  const rule = offers.find(
    offer => offer.item_code === cartItem.item.item_code
  );

  const originalPrice = Number(cartItem.item.price);
  const qty = cartItem.qty;

  if (!rule) {
    return {
      ...cartItem,
      final_price: originalPrice,
      subtotal: originalPrice * qty,
      is_discounted: false
    };
  }

  const minQty = Number(rule.min_qty);
  const offerUnitPrice = Number(rule.price);

  if (qty < minQty) {
    return {
      ...cartItem,
      final_price: originalPrice,
      subtotal: originalPrice * qty,
      is_discounted: false
    };
  }

  // 🔥 Bundle logic
  const bundles = Math.floor(qty / minQty);
  const remaining = qty % minQty;

  const bundlePrice = offerUnitPrice * minQty;

  const total =
    (bundles * bundlePrice) +
    (remaining * originalPrice);

  return {
    ...cartItem,
    final_price: total / qty,   // average per item for UI
    subtotal: total,
    is_discounted: true
  };
});

// Prepare for UI (matching your static structure)
const cartItems = updatedCart.map(item => ({
  id: item.item.item_code,
  name: item.item.item_name,
  emoji: item.item.emoji,
  unit: item.item.unit,
  price: item.final_price,
  quantity: item.qty,
  subtotal: item.subtotal,
  original_price: item.item.price,
  is_discounted: item.is_discounted,
  image: item.item.image ? (item.item.image.startsWith('http') ? item.item.image : `http://groceryv15.localhost:8001${item.item.image}`) : null,
  item_code: item.item.item_code
}));
// Totals
const subtotal = updatedCart.reduce(
  (sum, item) => sum + item.subtotal,
  0
);

const shippingCost = cart.length > 0 ? 5.99 : 0;
// const tax = subtotal * 0.08;
const tax = updatedCart.reduce((sum, item) => {

  const price = item.subtotal;

  const product = item.item;

  let rate = 0;

  if (product.food_stamp) {
    rate = 0.02;
  }
  else if (product.non_food) {
    rate = 0.08;
  }
  else if (product.tobacco) {
    rate = 0.05;
  }

  return sum + (price * rate);

}, 0);
const total = subtotal + tax;

// Logic to remove the item
const handleRemoveItem = (itemCode) => {
  setCartObject(prev => {
    const next = { ...prev }
    delete next[itemCode]
    // try { localStorage.setItem('cart', JSON.stringify(next)) } catch (e) {}
    try { localStorage.setItem('cart', JSON.stringify(next)) } catch (e) {console.log(e)}
    return next
  })
};

// Increase / decrease quantity helpers (mirror Home.jsx behavior)
function increaseQty(product) {
  const key = product || product === 0 ? product : null
  // product expected to be itemCode string
  if (!key) return
  setCartObject(prev => {
    const next = { ...prev }
    if (!next[key]) return prev
    next[key] = {
      ...next[key],
      qty: (next[key].qty || 0) + 1
    }
    try { localStorage.setItem('cart', JSON.stringify(next)) } catch (e) {console.log(e)}
    return next
  })
}

function decreaseQty(product) {
  const key = product || product === 0 ? product : null
  if (!key) return
  setCartObject(prev => {
    const next = { ...prev }
    const currentQty = next[key]?.qty || 0
    if (currentQty <= 1) {
      delete next[key]
    } else {
      next[key] = { ...next[key], qty: currentQty - 1 }
    }
    try { localStorage.setItem('cart', JSON.stringify(next)) } catch (e) {console.log(e)}
    return next
  })
}

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    cardNumber: '',
    cardExpiry: '',
    cardCVV: ''
  });

  
useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;

  axios.get("http://localhost:8000/api/profile/", {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => {
    setFormData(prev => ({
      ...prev,
      firstName: res.data.first_name || "",
      lastName: res.data.last_name || "",
      email: res.data.email || ""
    }));
  })
  .catch(err => console.log(err));

}, []);

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit-card');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleExpiryChange = (e) => {
    let raw = e.target.value

    // Strip everything except digits
    raw = raw.replace(/\D/g, '')

    // Cap at 4 digits (MMYY)
    if (raw.length > 4) raw = raw.slice(0, 4)

    // Auto-insert slash after 2 digits
    if (raw.length >= 3) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2)
    }

    setFormData(prev => ({ ...prev, cardExpiry: raw }))
  }

  const handleSubmitOrder = async (e) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert('Please fill in all personal information fields');
      return;
    }

    if (updatedCart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    try {

      const items = updatedCart.map(item => ({
        item_code: item.item.item_code,
        qty: item.qty,
        name: item.item.item_name,
        // rate: item.subtotal / item.qty
        original_price:item.item.price,
        amount: item.subtotal,
        image: item.item.image ? (item.item.image.startsWith('http') ? item.item.image : `http://groceryv15.localhost:8001${item.item.image}`) : null,
      }));
      const order_id = crypto.randomUUID();

      const payload = {
        customer_name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        items: items,
        tax:tax,
        order_id:order_id
      };

      const res = await axios.post(
        "http://localhost:8000/api/create-sales-invoice/",
        payload
      );

      console.log("Invoice created:", res.data);

      const newOrderNumber = res.data.invoice;
      setOrderNumber(newOrderNumber);
      setOrderPlaced(true);

      if (onClearCart) onClearCart();

    } catch (error) {
      console.error(error);
      alert("Order failed");
    }
  };

  const handleContinueShopping = () => {
    setOrderPlaced(false);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      zipCode: '',
      cardNumber: '',
      cardExpiry: '',
      cardCVV: ''
    });

    if (onNavigate) onNavigate('home');
  };

  if (orderPlaced) {
    return (
      <div className="site-root">
        <header className="checkout-header">
          <div className="header-inner">
            <div className="brand" onClick={() => onNavigate('/')}>
              <div className="logo-mark">🌿</div>
              <div className="brand-name">StarBazar</div>
            </div>
          </div>
        </header>

        <section className="checkout-hero">
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <h1>Order Confirmed! 🎉</h1>
          </div>
        </section>

        <main className="checkout-container">
          <div className="order-confirmation">
            <div className="confirmation-icon">✓</div>
            <h2>Thank You for Your Order!</h2>
            <p className="order-number">Order Number: <strong>{orderNumber}</strong></p>
            <p className="order-message">Your order has been successfully placed. You will receive a confirmation email shortly with tracking information.</p>
            
            <div className="order-summary-card">
              <h3>Order Summary</h3>
              <div className="summary-details">
                <div className="summary-item">
                  <span>Items:</span>
                  <strong>{cart.length}</strong>
                </div>
                <div className="summary-item">
                  <span>Subtotal:</span>
                  <strong>${subtotal.toFixed(2)}</strong>
                </div>
                <div className="summary-item">
                  <span>Shipping:</span>
                  <strong>${shippingCost.toFixed(2)}</strong>
                </div>
                <div className="summary-item">
                  <span>Tax:</span>
                  <strong>${tax.toFixed(2)}</strong>
                </div>
                <div className="summary-divider"></div>
                <div className="summary-item total">
                  <span>Total:</span>
                  <strong>${total.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div className="confirmation-actions">
              <button className="btn-primary" onClick={handleContinueShopping}>
                Continue Shopping
              </button>
            </div>
          </div>
        </main>

        <footer className="checkout-footer">
          <div className="footer-content">
            <div className="footer-left">
              © {new Date().getFullYear()} StarBazar — Fresh groceries delivered.
            </div>
            <div className="footer-right">
              <div className="company-info">
                <h4>StarBazar Inc.</h4>
                <p>123 Main Street<br />New York, NY 10001<br />USA</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="site-root">
      <header className="checkout-header">
        <div className="header-inner">
          <div className="brand" onClick={() => onNavigate('/')}>
            <div className="logo-mark">🌿</div>
            <div className="brand-name">StarBazar</div>
          </div>
          <nav className="header-actions">
            <button className="icon-btn" onClick={() => navigate('/')}>🏠 Back to Home</button>
          </nav>
        </div>
      </header>

      <section className="checkout-hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>Checkout</h1>
          <p>Complete your purchase securely</p>
          <div className="hero-categories">
            {['Home','Shop All','Contact Us','Checkout'].map((c) => (
              <button 
                key={c} 
                className={`hero-cat-btn ${c === 'Checkout' ? 'active' : ''}`}
                onClick={() => {
                  if (c === 'Home') {
                    navigate('/')
                  } else if (c === 'Shop All') {
                    navigate('/allproducts')
                  } else if (c === 'Contact Us') {
                    // Handle Contact Us
                    alert('Contact Us page coming soon!')
                  }
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="checkout-container">
        {cart.length === 0 ? (
          <div className="empty-cart">
            <div className="empty-icon">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Add some fresh groceries to get started!</p>
            <button className="btn-primary" onClick={() => onNavigate('products')}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="checkout-wrapper">
            {/* Left Column - Payment Form */}
            <section className="checkout-form-section left-form">
              <form onSubmit={handleSubmitOrder}>
                {/* Personal Information - Always visible */}
                <div className="form-section">
                  <div className="section-header">
                    <h2>👤 Contact Information</h2>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="firstName">First Name *</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name *</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                </div>

                {/* Delivery Method Selection */}
                <div className="form-section">
                  <div className="section-header">
                    <h3>🚚 Delivery Method</h3>
                  </div>
                  <div className="delivery-options">
                    <label className="delivery-option">
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value="credit-card"
                        checked={paymentMethod === 'credit-card'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      />
                      <span className="delivery-label">
                        <span className="delivery-icon">🚚</span>
                        <span className="delivery-text">
                          <strong>Home Delivery</strong>
                          <small>We deliver to your address ($5.99)</small>
                        </span>
                      </span>
                    </label>
                    <label className="delivery-option">
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value="pickup-from-store"
                        checked={paymentMethod === 'pickup-from-store'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      />
                      <span className="delivery-label">
                        <span className="delivery-icon">🏪</span>
                        <span className="delivery-text">
                          <strong>Pickup from Store</strong>
                          <small>Free pickup at our store</small>
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Delivery Address - Only for Home Delivery */}
                {paymentMethod === 'credit-card' && (
                  <div className="form-section">
                    <div className="section-header">
                      <h3>📍 Delivery Address</h3>
                    </div>
                    <div className="form-group full">
                      <label htmlFor="address">Address *</label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="123 Main Street"
                        required
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="city">City *</label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="New York"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="zipCode">ZIP Code *</label>
                        <input
                          type="text"
                          id="zipCode"
                          name="zipCode"
                          value={formData.zipCode}
                          onChange={handleInputChange}
                          placeholder="10001"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Pickup Info - Only for Store Pickup */}
                {paymentMethod === 'pickup-from-store' && (
                  <div className="form-section">
                    <div className="store-pickup-info-form">
                      <div className="pickup-icon">🏪</div>
                      <h4>Store Pickup Details</h4>
                      
                      {/* Google Map Embed */}
                      <div className="map-container">
                        <iframe
                          width="100%"
                          height="300"
                          style={{ border: 0, borderRadius: '8px' }}
                          loading="lazy"
                          allowFullScreen=""
                          referrerPolicy="no-referrer-when-downgrade"
                          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3350.8891234567!2d-79.7968624!3d34.1914411!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x885567bca62ddb6d%3A0x81cae9f6181dfde4!2sStar%20Bazaar!5e0!3m2!1sen!2sus!4v1709658000000"
                        ></iframe>
                      </div>

                      {/* Store Details */}
                      <div className="store-address">
                        <p><strong>Star Bazaar</strong></p>
                        <p>📍 1603 W Palmetto</p>
                        <p>St Florence, SC 29501, USA</p>
                        <p>📞 +1 (843) 799-1099</p>
                        <p>🕐 Mon-Sun: 10:00 AM - 8:00 PM</p>
                      </div>

                      {/* View on Google Maps Button */}
                      <button
                        type="button"
                        className="btn-view-maps"
                        onClick={() => window.open('https://www.google.com/maps/place/Star+Bazaar/@34.1914411,-79.7968624,17z/data=!3m1!4b1!4m6!3m5!1s0x885567bca62ddb6d:0x81cae9f6181dfde4!8m2!3d34.1914411!4d-79.7968624!16s%2Fg%2F11j3x14mkc?hl=en&entry=ttu&g_ep=EgoyMDI2MDMwMi4wIKXMDSoASAFQAw%3D%3D', '_blank')}
                      >
                        📍 View Full Map
                      </button>

                      <p className="pickup-note">Your order will be ready within 2-3 hours. Please bring a valid ID and order confirmation.</p>
                    </div>
                  </div>
                )}

                <div className="divider"></div>

                {/* Payment Information */}
                <div className="form-section">
                  <div className="section-header">
                    <h3>💳 Payment Information</h3>
                  </div>
                  <p className="payment-note">Pay securely with your credit or debit card</p>

                  <div className="form-group full">
                    <label htmlFor="cardNumber">Card Number *</label>
                    <input
                      type="text"
                      id="cardNumber"
                      name="cardNumber"
                      value={formData.cardNumber}
                      onChange={handleInputChange}
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="cardExpiry">Expiry Date *</label>
                      <input
                        type="text"
                        id="cardExpiry"
                        name="cardExpiry"
                        value={formData.cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        maxLength="5"
                        inputMode="numeric"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="cardCVV">CVV *</label>
                      <input
                        type="text"
                        id="cardCVV"
                        name="cardCVV"
                        value={formData.cardCVV}
                        onChange={handleInputChange}
                        placeholder="123"
                        maxLength="3"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="divider"></div>

                <button type="submit" className="btn-submit">
                  Place Order - ${total.toFixed(2)}
                </button>
              </form>
            </section>

            {/* Right Column - Order Summary with Products */}
            <aside className="checkout-summary-section right-summary">
              <div className="order-summary">
                <h3>Your Order</h3>

                <div className="cart-items-container">
                  <div className="cart-items">
                    {cartItems.map((item, index) => (
                      <div key={index} className="cart-item-right">
                        <div className="item-image-wrapper">
                          {item.image ? (
                            <div className="item-image-container">
                              <img src={item.image} alt={item.name} className="item-image" />
                            </div>
                          ) : (
                            <div className="item-emoji">{item.emoji}</div>
                          )}
                        </div>
                        
                        <div className="item-middle-section">
                          <div className="item-details-right">
                            <div className="item-name-right">{item.name}</div>
                            <div className="item-unit-right">{item.unit}</div>
                                {item.is_discounted && (
                                    <div style={{color: "green", fontSize: "0.85rem", fontWeight: "600", marginTop: "0.3rem"}}>
                                    Offer Applied 🎉
                                    <div style={{color:"#888", fontSize:"0.8rem"}}>
                                        Original: ${item.original_price.toFixed(2)}
                                    </div>
                                    </div>
                                )}
                          </div>
                          <div className="qty-controls-bottom">
                            <button className="qty-btn minus" onClick={() => decreaseQty(item.id)}>−</button>
                            <span className="qty-display-right">{item.quantity}</span>
                            <button className="qty-btn plus" onClick={() => increaseQty(item.id)}>+</button>
                          </div>
                        </div>
                        
                        <div className="item-right-actions">
                          <div className="item-price-right">${item.price.toFixed(2)}</div>
                          <button 
                            className="item-remove"
                            onClick={() => handleRemoveItem(item.id)}
                            title="Remove item"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="summary-details">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <strong>${subtotal.toFixed(2)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Shipping</span>
                    <strong>Free</strong>
                  </div>
                  <div className="summary-row">
                    <span>Tax Payable</span>
                    <strong>${tax.toFixed(2)}</strong>
                  </div>
                  <div className="summary-divider"></div>
                  <div className="summary-row total">
                    <span>Total</span>
                    <strong>${total.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="shipping-info">
                  <p>📦 Free shipping on orders over $50</p>
                  <p>🔒 Secure checkout with SSL encryption</p>
                  <p>✓ 100% satisfaction guaranteed</p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>

      <footer className="checkout-footer">
        <div className="footer-content">
          <div className="footer-left">
            © {new Date().getFullYear()} StarBazar — Fresh groceries delivered.
          </div>
          <div className="footer-right">
            <div className="company-info">
              <h4>StarBazar Inc.</h4>
              <p>123 Main Street<br />New York, NY 10001<br />USA</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Checkout