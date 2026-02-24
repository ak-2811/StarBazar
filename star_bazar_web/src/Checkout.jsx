import { useState } from 'react'
import React from 'react'
import './Checkout.css'
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

function Checkout({ onNavigate, onRemoveFromCart, onClearCart }) {

  const location = useLocation();
  const navigate= useNavigate();

// Get cart object from Home
// const cartObject = location.state?.cart || {};
const cartObject = JSON.parse(localStorage.getItem("cart")) || {};
const offers = location.state?.offers || [];

// Convert object → array (REAL cart)
const cart = Object.values(cartObject);



// 🔥 Apply offer logic
const updatedCart = cart.map(cartItem => {

  const rule = offers.find(
    offer => offer.item_code === cartItem.item.item_code
  );

  if (rule && cartItem.qty >= rule.min_qty) {
    return {
      ...cartItem,
      final_price: rule.offer_price,
      is_discounted: true
    };
  }

  return {
    ...cartItem,
    final_price: cartItem.item.price,
    is_discounted: false
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
  subtotal: item.final_price * item.qty,
  original_price: item.item.price,
  is_discounted: item.is_discounted
}));
// Totals
const subtotal = updatedCart.reduce(
  (sum, item) => sum + (item.final_price * item.qty),
  0
);

const shippingCost = cart.length > 0 ? 5.99 : 0;
const tax = subtotal * 0.08;
const total = subtotal + shippingCost + tax;

// Logic to remove the item
const handleRemoveItem = (itemCode) => {
  const savedCart = JSON.parse(localStorage.getItem("cart")) || {};

  delete savedCart[itemCode];

  localStorage.setItem("cart", JSON.stringify(savedCart));

  // Refresh page state
  navigate(0);
};

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

  const handleSubmitOrder = (e) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert('Please fill in all personal information fields');
      return;
    }

     // Validation for delivery address (only if credit-card payment)
    if (paymentMethod === 'credit-card') {
      if (!formData.address || !formData.city || !formData.zipCode) {
        alert('Please fill in all delivery address fields')
        return
      }
      if (!formData.cardNumber || !formData.cardExpiry || !formData.cardCVV) {
        alert('Please fill in all payment fields')
        return
      }
    }

    if (updatedCart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    const newOrderNumber = `SB${Date.now()}`;
    setOrderNumber(newOrderNumber);
    setOrderPlaced(true);

    if (onClearCart) onClearCart();
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
            <div className="brand" onClick={() => onNavigate('home')}>
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
            {/* Left Column - Order Summary with Products */}
            <aside className="checkout-summary-section">
              <div className="order-summary">
                <h3>Your Order</h3>

                <div className="cart-items-container">
                  <div className="cart-items-header">
                    <span>Product Details</span>
                    <span>Qty</span>
                    <span>Price</span>
                  </div>
                  <div className="cart-items">
                    {cartItems.map((item, index) => (
                      <div key={index} className="cart-item">
                        <div className="item-info">
                          <div className="item-emoji">{item.emoji}</div>
                          <div className="item-details">
                            <div className="item-name">{item.name}</div>
                            <div className="item-unit">${item.price.toFixed(2)} per {item.unit}</div>
                                {item.is_discounted && (
                                    <div style={{color: "green", fontSize: "0.85rem", fontWeight: "600"}}>
                                    Offer Applied 🎉
                                    <div style={{color:"#888", fontSize:"0.8rem"}}>
                                        Original: ${item.original_price.toFixed(2)}
                                    </div>
                                    </div>
                                )}
                          </div>
                        </div>
                        <div className="item-qty">x{item.quantity}</div>
                        <div className="item-price">${item.subtotal.toFixed(2)}</div>
                        <button 
                          className="item-remove"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remove item"
                        >
                          ✕
                        </button>
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
                    <strong>${shippingCost.toFixed(2)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Tax (8%)</span>
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

            {/* Right Column - Payment Form */}
            <section className="checkout-form-section">
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
                      <div className="store-address">
                        <p><strong>StarBazar Main Store</strong></p>
                        <p>📍 123 Main Street</p>
                        <p>New York, NY 10001, USA</p>
                        <p>📞 +1 (555) 123-4567</p>
                        <p>🕐 Mon-Sun: 9:00 AM - 9:00 PM</p>
                      </div>
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
                          onChange={handleInputChange}
                          placeholder="MM/YY"
                          maxLength="5"
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