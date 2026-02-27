import { useState, useEffect } from 'react'
import axios from 'axios'
import React from 'react'
import './Home.css'
import { useNavigate } from "react-router-dom";

function Home() {
  // Enhanced product data with categories
  const [bestSellers, setBestSellers] = useState([])
  const [shopallProducts,setShopAllProducts]=useState([])
  const [specialOffers,setSpecialOffers]=useState([])
  const navigate = useNavigate();

  // Getting Best Seller Products
  useEffect(() => {
  axios.get("http://localhost:8000/api/best-sellers/")
    .then(res => {
      setBestSellers(res.data)
    })
    .catch(err => {
      console.error("Error fetching best sellers:", err)
    })
}, [])

  // Getting All Product For Home Page
  useEffect(() => {
  axios.get("http://localhost:8000/api/shop-all-products/")
    .then(res => {
      setShopAllProducts(res.data)
    })
    .catch(err => {
      console.error("Error fetching best sellers:", err)
    })
}, [])

  useEffect(() => {
  axios.get("http://localhost:8000/api/pricing-offers/")
    .then(res => {
      setSpecialOffers(res.data)
    })
    .catch(err => {
      console.error("Error fetching best sellers:", err)
    })
}, [])

  // Offers data
  // const offers = [
  //   { id: 101, name: 'Red Apples', originalPrice: 5.99, offerPrice: 2.99, offerText: 'Buy 2 at 2.99', category: 'Fruits', emoji: '🍎' },
  //   { id: 102, name: 'Organic Milk', originalPrice: 6.99, offerPrice: 3.49, offerText: 'Buy 2 at 2.99', category: 'Dairy', emoji: '🥛' },
  //   { id: 103, name: 'Bananas', originalPrice: 3.99, offerPrice: 1.29, offerText: 'Buy 2 at 2.99', category: 'Fruits', emoji: '🍌' },
  //   { id: 104, name: 'Cheddar Cheese', originalPrice: 8.99, offerPrice: 4.59, offerText: 'Buy 2 at 2.99', category: 'Dairy', emoji: '🧀' },
  // ]

const [cart, setCart] = useState(
  JSON.parse(localStorage.getItem("cart")) || {}
)
console.log("Cart Keys:", Object.keys(cart))

useEffect(() => {
  localStorage.setItem("cart", JSON.stringify(cart))
}, [cart])

const goToCheckout = () => {
  navigate("/checkout", {
    state: {
      offers: specialOffers
    }
  });
};

  // Local wishlist state (keeps track of liked / wishlisted products)
  const [liked, setLiked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('liked')) || {}
    } catch (e) {
      return {}
    }
  })

  function toggleLike(productId) {
    setLiked(prev => {
      const next = { ...prev, [productId]: !prev[productId] }
      try {
        localStorage.setItem('liked', JSON.stringify(next))
      } catch (e) {
        // ignore storage errors
      }
      return next
    })
  }

function increaseQty(p) {
  const key = p.item_code
  console.log("Current Product Code:", p.item_code)
  setCart(prev => ({
    ...prev,
    [key]: {
      item: p,
      qty: (prev[key]?.qty || 0) + 1
    }
  }))
}

function decreaseQty(p) {
  const key = p.item_code

  setCart(prev => {
    const currentQty = prev[key]?.qty || 0

    if (currentQty <= 1) {
      // Remove completely
      const updated = { ...prev }
      delete updated[key]
      return updated
    }

    return {
      ...prev,
      [key]: {
        ...prev[key],
        qty: currentQty - 1
      }
    }
  })

}

  return (
    <div className="site-root">
      <header className="site-header">
        <div className="header-inner">
          <div className="brand">
            <div className="logo-mark">🌿</div>
            <div className="brand-name">StarBazar</div>
          </div>
          {/* <div className="search">
            <input placeholder="Search for products..." />
          </div> */}
          <nav className="header-actions">
            <button className="icon-btn" onClick={() => navigate('/wishlist')}>❤</button>
            <button className="icon-btn" onClick={() => goToCheckout()}>🛒 <span className="cart-count">{Object.values(cart).reduce((total, item) => total + item.qty, 0)}</span></button>
          </nav>
        </div>
      </header>

      <section className="hero-banner">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>Fresh Groceries, Faster Checkout</h1>
          <p>Shop the best quality products at great prices!</p>
          <div className="hero-categories">
            {['Home','Shop All','Contact Us'].map((c, idx) => (
              <button key={c} className={`hero-cat-btn ${idx === 0 ? 'active' : ''}`}>{c}</button>
            ))}
          </div>
        </div>
      </section>

      <main className="container">
        <section className="best-sellers">
          <h3>Best Sellers</h3>
          <div className="seller-list">
            {bestSellers.map(p => (
              <article key={p.item_code} className="product-card small">
                <button
                  type="button"
                  className={`heart-btn ${liked[p.item_code] ? 'liked' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleLike(p.item_code) }}
                  title={liked[p.item_code] ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  {liked[p.item_code] ? '❤' : '🤍'}
                </button>
                <div className="product-img">
                  {p.image ? <img src={`http://groceryv15.localhost:8001/${p.image}`} alt={p.item_code} /> : p.emoji}
                </div>
                <div className="product-body">
                  <div className="product-name">{p.item_name}</div>
                  <div className="product-price">${p.price.toFixed(2)} <span className="unit">/ {p.unit}</span></div>
                  {cart[p.item_code] ? (
                    <div className="qty-selector">
                      <button className="qty-btn minus" onClick={() => decreaseQty(p)}>−</button>
                      <div className='qty-display'>
                        <span className="qty-value">
                          {cart[p.item_code].qty}
                        </span>
                      </div>

                      <button className="qty-btn plus" onClick={() => increaseQty(p)}>+</button>
                    </div>
                  ) : (
                    <button className="add-btn" onClick={() => increaseQty(p)}> Add to Cart </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="offers-section">
          <h3>🎉 Special Offers</h3>
          <div className="offers-grid">
            {specialOffers.map(p => (
              <article key={p.item_code} className="offer-card">
                <button
                  type="button"
                  className={`heart-btn ${liked[p.item_code] ? 'liked' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleLike(p.item_code) }}
                  title={liked[p.item_code] ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  {liked[p.item_code] ? '❤' : '🤍'}
                </button>
                <div className="offer-badge">Special Deal</div>
                <div className="offer-img">{p.image ? <img src={`http://groceryv15.localhost:8001${p.image}`} alt={p.item_code} /> : p.emoji}</div>
                <div className="offer-body">
                  <div className="offer-name">{p.item_name}</div>
                  <div className="price-section">
                    <div className="original-price">${p.original_price.toFixed(2)}</div>
                  </div>
                  <div className="offer-text">{p.title}</div>
                  {cart[p.item_code] ? (
                    <div className="qty-selector">
                      <button className="qty-btn minus" onClick={() => decreaseQty(p)}>−</button>
                      <div className='qty-display'>
                        <span className="qty-value">
                          {cart[p.item_code].qty}
                        </span>
                      </div>

                      <button className="qty-btn plus" onClick={() => increaseQty(p)}>+</button>
                    </div>
                  ) : (
                    <button className="add-btn" onClick={() => increaseQty(p)}> Add to Cart </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="shop-grid">
          <h3>Shop All Products</h3>
          <div className="grid">
            {shopallProducts.map(p => (
              <article key={p.item_code} className="product-card">
                <button
                  type="button"
                  className={`heart-btn ${liked[p.item_code] ? 'liked' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleLike(p.item_code) }}
                  title={liked[p.item_code] ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  {liked[p.item_code] ? '❤' : '🤍'}
                </button>
                <div className="product-img large">{p.image ? <img src={`http://groceryv15.localhost:8001${p.image}`} alt={p.item_code} /> : p.emoji}</div>
                <div className="product-body">
                  <div className="product-name">{p.item_name}</div>
                  <div className="product-price">${p.price.toFixed(2)} <span className="unit">/ {p.unit}</span></div>
                  {cart[p.item_code] ? (
                    <div className="qty-selector">
                      <button className="qty-btn minus" onClick={() => decreaseQty(p)}>−</button>
                      <div className='qty-display'>
                        <span className="qty-value">
                          {cart[p.item_code].qty}
                        </span>
                      </div>

                      <button className="qty-btn plus" onClick={() => increaseQty(p)}>+</button>
                    </div>
                  ) : (
                    <button className="add-btn" onClick={() => increaseQty(p)}> Add to Cart </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
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

export default Home