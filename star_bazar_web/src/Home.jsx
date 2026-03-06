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
  const [selectedNutrition, setSelectedNutrition] = useState(null)
  const [showBack, setShowBack] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const navigate = useNavigate();

  // Nutrition block open and close 
//   function openNutrition(e, product) {
//   e.stopPropagation()
//   setSelectedNutrition(product)
// }

  function openNutrition(e, product) {
    e.stopPropagation()
    setShowBack(false)   // Always start with front image
    setSelectedNutrition(product)
}

  function closeNutritionModal() {
    setSelectedNutrition(null)
  }

  // Fetch current user on component mount
  useEffect(() => {
    const checkUser = () => {
      const token = localStorage.getItem("token")
      const username = localStorage.getItem("username")
      
      console.log("Token:", token, "Username:", username)
      
      if (token && username) {
        setCurrentUser(username)
      } else {
        setCurrentUser(null)
      }
    }
    
    checkUser()
    
    // Listen for storage changes (for cross-tab sync)
    window.addEventListener("storage", checkUser)
    
    // Also listen for focus to re-check user state
    window.addEventListener("focus", checkUser)
    
    return () => {
      window.removeEventListener("storage", checkUser)
      window.removeEventListener("focus", checkUser)
    }
  }, [])

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

// Getting the offer products
  useEffect(() => {
  axios.get("http://localhost:8000/api/pricing-offers/")
    .then(res => {
      setSpecialOffers(res.data)
    })
    .catch(err => {
      console.error("Error fetching best sellers:", err)
    })
}, [])

const [cart, setCart] = useState(
  JSON.parse(localStorage.getItem("cart")) || {}
)
// console.log("Cart Keys:", Object.keys(cart))

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

  // DB wishlist state (keeps track of liked / wishlisted products)
  // const [liked, setLiked] = useState({})

  // useEffect(() => {
  //   const token = localStorage.getItem("token")

  //   if (!token) return

  //   axios.get("http://localhost:8000/api/wishlist/", {
  //     headers: {
  //       Authorization: `Bearer ${token}`
  //     }
  //   })
  //   .then(res => {
  //     const likedMap = {}
  //     res.data.item_codes.forEach(code => {
  //       likedMap[code] = true
  //     })
  //     setLiked(likedMap)
  //   })
  //   .catch(err => {
  //     console.log("Wishlist fetch error:", err)
  //   })

  // }, [])

  // function toggleLike(item_code) {
  //   const token = localStorage.getItem("token")

  //   if (!token) {
  //     navigate("/login")
  //     return
  //   }
  //   axios.post(
  //     "http://localhost:8000/api/wishlist/toggle/",
  //     { item_code },
  //     {
  //       headers: {
  //         Authorization: `Bearer ${token}`
  //       }
  //     }
  //   )
  //   .then(res => {

  //     setLiked(prev => ({
  //       ...prev,
  //       [item_code]: res.data.status === "added"
  //     }))

  //   })
  //   .catch(err => {
  //     console.log("Wishlist error:", err)
  //   })
  // }

const [liked, setLiked] = useState({})

useEffect(() => {
  const fetchWishlist = async () => {
    let access = localStorage.getItem("token")
    const refresh = localStorage.getItem("refresh")

    if (!access) return

    try {
      const res = await axios.get(
        "http://localhost:8000/api/wishlist/",
        {
          headers: { Authorization: `Bearer ${access}` }
        }
      )

      const likedMap = {}
      res.data.item_codes.forEach(code => {
        likedMap[code] = true
      })
      setLiked(likedMap)

    } catch (err) {

      // 🔥 If access expired
      if (err.response?.status === 401 && refresh) {
        try {
          const refreshRes = await axios.post(
            "http://localhost:8000/api/token/refresh/",
            { refresh }
          )

          const newAccess = refreshRes.data.access
          localStorage.setItem("access", newAccess)

          // Retry wishlist
          const retry = await axios.get(
            "http://localhost:8000/api/wishlist/",
            {
              headers: { Authorization: `Bearer ${newAccess}` }
            }
          )

          const likedMap = {}
          retry.data.item_codes.forEach(code => {
            likedMap[code] = true
          })
          setLiked(likedMap)

        } catch {
          localStorage.clear()
          navigate("/login")
        }
      }
    }
  }

  fetchWishlist()
}, [navigate])

async function toggleLike(item_code) {
  let access = localStorage.getItem("token")
  const refresh = localStorage.getItem("refresh")

  if (!access) {
    navigate("/login")
    return
  }

  try {
    const res = await axios.post(
      "http://localhost:8000/api/wishlist/toggle/",
      { item_code },
      {
        headers: { Authorization: `Bearer ${access}` }
      }
    )

    setLiked(prev => ({
      ...prev,
      [item_code]: res.data.status === "added"
    }))

  } catch (err) {

    if (err.response?.status === 401 && refresh) {
      try {
        const refreshRes = await axios.post(
          "http://localhost:8000/api/token/refresh/",
          { refresh }
        )

        const newAccess = refreshRes.data.access
        localStorage.setItem("access", newAccess)

        const retry = await axios.post(
          "http://localhost:8000/api/wishlist/toggle/",
          { item_code },
          {
            headers: { Authorization: `Bearer ${newAccess}` }
          }
        )

        setLiked(prev => ({
          ...prev,
          [item_code]: retry.data.status === "added"
        }))

      } catch {
        localStorage.clear()
        navigate("/login")
      }
    }
  }
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

const handleLogout = () => {
  localStorage.removeItem("token")
  localStorage.removeItem("username")
  setCurrentUser(null)
  setShowUserMenu(false)
  navigate("/login")
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
            
            {currentUser ? (
              <div className="user-profile-container">
                <button 
                  className="user-profile-btn"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  title={currentUser}
                >
                  <span className="user-avatar">👤</span>
                  <span className="user-name">{currentUser}</span>
                  <span className="dropdown-arrow">▼</span>
                </button>
                
                {showUserMenu && (
                  <div className="user-dropdown-menu">
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        goToCheckout()
                        setShowUserMenu(false)
                      }}
                    >
                      🛒 Checkout
                    </button>
                    <div className="dropdown-divider"></div>
                    <button 
                      className="dropdown-item logout"
                      onClick={handleLogout}
                    >
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                className="icon-btn login-btn"
                onClick={() => navigate('/login')}
              >
                🔐 Login
              </button>
            )}
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
              <button key={c} 
              className={`hero-cat-btn ${idx === 0 ? 'active' : ''}`}
              onClick={() => {
                  if (c === 'Home') {
                    navigate('/')
                  } else if (c === 'Shop All') {
                    // Handle Contact Us
                    navigate('allproducts/')
                  }
                }}>{c}</button>
            ))}
          </div>
        </div>
      </section>

      <main className="container">
        <section className="best-sellers">
          <h3>Best Sellers</h3>
          <div className="seller-list">
            {bestSellers.map(p => (
              <article key={p.item_code} className="product-card-full">
                <div className="product-img-container large">
                  <div className="product-img-front">
                    <div className="product-img">
                      {p.image ? (
                        <img src={`http://groceryv15.localhost:8001/${p.image}`} alt={p.item_code} />
                      ) : (
                        p.emoji
                      )}
                    </div>
                    {p.back_image && (
                      <button
                        className="info-btn"
                        onClick={(e) => openNutrition(e, p)}
                        title="More Info"
                      >
                        <i>i</i>
                      </button>
                    )}
                  </div>
                </div>
                <button
                  className={`heart-btn ${liked[p.item_code] ? 'liked' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleLike(p.item_code) }}
                  title={liked[p.item_code] ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {liked[p.item_code] ? '❤' : '🤍'}
                </button>
                <div className="product-body-full">
                  <div className="product-name-full">{p.item_name}</div>
                  <div className="product-price-full">
                    ${p.price.toFixed(2)} <span className="unit">/ {p.unit}</span>
                  </div>
                  {p.stock === 0 ? (
                    <button className="add-btn-full disabled-btn" disabled>
                      Out of Stock
                    </button>
                  ) : !cart[p.item_code] ? (
                    <button className="add-btn-full" onClick={() => increaseQty(p)}>
                      Add to Cart
                    </button>
                  ) : (
                    <div className="qty-selector-full">
                      <button className="qty-btn-full minus" onClick={() => decreaseQty(p)}>−</button>
                      <div className="qty-display-full">
                        <span className="qty-value-full">{cart[p.item_code].qty}</span>
                      </div>
                      <button className="qty-btn-full plus" onClick={() => increaseQty(p)}>+</button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
        {selectedNutrition && (
            <div className="nutrition-modal-overlay" onClick={closeNutritionModal}>
              <div
                className="nutrition-modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="nutrition-modal-header">
                  <h2>{selectedNutrition.item_name} Info</h2>
                  <button className="close-modal-btn" onClick={closeNutritionModal}>×</button>
                </div>

                <div className="nutrition-modal-body">
                  <div className="modal-image-container">
                    <img
                      src={`http://groceryv15.localhost:8001${
                        showBack && selectedNutrition.back_image
                          ? selectedNutrition.back_image
                          : selectedNutrition.image
                      }`}
                      alt={showBack ? "Back Side" : "Product View"}
                      className={`modal-product-img ${showBack ? 'back-view' : 'front-view'}`}
                    />
                    <div className="image-label">
                      {showBack ? "Nutrition & Details" : "Product View"}
                    </div>
                  </div>
                </div>

                <div className="nutrition-modal-footer">
                  <div className="image-nav-container">
                    <button 
                      className="image-nav-btn nav-left"
                      onClick={() => setShowBack(false)}
                      title="View Product"
                      aria-label="Previous"
                    >
                      ‹
                    </button>
                    
                    <div className="image-dots">
                      <button 
                        className={`dot ${!showBack ? 'active' : ''}`}
                        onClick={() => setShowBack(false)}
                        title="Front"
                        aria-label="View front"
                      ></button>
                      {selectedNutrition.back_image && (
                        <button 
                          className={`dot ${showBack ? 'active' : ''}`}
                          onClick={() => setShowBack(true)}
                          title="Back"
                          aria-label="View back"
                        ></button>
                      )}
                    </div>
                    
                    <button 
                      className="image-nav-btn nav-right"
                      onClick={() => setShowBack(true)}
                      title="View Nutrition Info"
                      aria-label="Next"
                    >
                      ›
                    </button>
                  </div>
                  <button className="done-btn" onClick={closeNutritionModal}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        <section className="offers-section">
          <h3>🎉 Special Offers</h3>
          <div className="offers-grid">
            {specialOffers.map(p => (
              <article key={p.item_code} className="offer-card">
                {/* <button
                  type="button"
                  className={`heart-btn ${liked[p.item_code] ? 'liked' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleLike(p.item_code) }}
                  title={liked[p.item_code] ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  {liked[p.item_code] ? '❤' : '🤍'}
                </button> */}
                <div className="offer-badge">Special Deal</div>
                <div className="offer-img">{p.image ? <img src={`http://groceryv15.localhost:8001/${p.image}`} alt={p.item_code} /> : p.emoji}</div>
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
              <article key={p.item_code} className="product-card-full">
                <div className="product-img-container large">
                  <div className="product-img-front">
                    <div className="product-img">
                      {p.image ? (
                        <img src={`http://groceryv15.localhost:8001/${p.image}`} alt={p.item_code} />
                      ) : (
                        p.emoji
                      )}
                    </div>
                    {p.back_image && (
                      <button
                        className="info-btn"
                        onClick={(e) => openNutrition(e, p)}
                        title="More Info"
                      >
                        <i>i</i>
                      </button>
                    )}
                  </div>
                </div>
                <button
                  className={`heart-btn ${liked[p.item_code] ? 'liked' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleLike(p.item_code) }}
                  title={liked[p.item_code] ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {liked[p.item_code] ? '❤' : '🤍'}
                </button>
                <div className="product-body-full">
                  <div className="product-name-full">{p.item_name}</div>
                  <div className="product-price-full">
                    ${p.price.toFixed(2)} <span className="unit">/ {p.unit}</span>
                  </div>
                  {p.stock === 0 ? (
                    <button className="add-btn-full disabled-btn" disabled>
                      Out of Stock
                    </button>
                  ) : !cart[p.item_code] ? (
                    <button className="add-btn-full" onClick={() => increaseQty(p)}>
                      Add to Cart
                    </button>
                  ) : (
                    <div className="qty-selector-full">
                      <button className="qty-btn-full minus" onClick={() => decreaseQty(p)}>−</button>
                      <div className="qty-display-full">
                        <span className="qty-value-full">{cart[p.item_code].qty}</span>
                      </div>
                      <button className="qty-btn-full plus" onClick={() => increaseQty(p)}>+</button>
                    </div>
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