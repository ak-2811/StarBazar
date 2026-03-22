import React, { useEffect, useState } from 'react'
import axios from 'axios'
import './Home.css'
import './Wishlist.css'
import { useNavigate } from 'react-router-dom'

function Wishlist() {
  const [likedMap, setLikedMap] = useState({})
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const[specialOffers,setSpecialOffers]=useState([])
  const [selectedNutrition, setSelectedNutrition] = useState(null)
  const [showBack, setShowBack] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const navigate = useNavigate()

  // Fetch current user
  useEffect(() => {
    const checkUser = () => {
      const token = localStorage.getItem("token")
      const username = localStorage.getItem("username")
      if (token && username) {
        setCurrentUser(username)
      } else {
        setCurrentUser(null)
      }
    }
    checkUser()
    window.addEventListener("storage", checkUser)
    window.addEventListener("focus", checkUser)
    return () => {
      window.removeEventListener("storage", checkUser)
      window.removeEventListener("focus", checkUser)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("username")
    setCurrentUser(null)
    setShowUserMenu(false)
    navigate("/login")
  }

  // Getting the offer products
  useEffect(() => {
  axios.get(`${import.meta.env.VITE_DJANGO_URL}/pricing-offers/`)
    .then(res => {
      setSpecialOffers(res.data)
    })
    .catch(err => {
      console.error("Error fetching best sellers:", err)
    })
}, [])

//   useEffect(() => {
//   const saved = JSON.parse(localStorage.getItem('liked')) || {}
//   setLikedMap(saved)
// }, [])

useEffect(() => {
  const token = localStorage.getItem("token")
  if (!token) {
    navigate("/login")
    return
  }
  setLoading(true)

  axios.get(`${import.meta.env.VITE_DJANGO_URL}/wishlist/`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  .then(res => {
    const likedCodes = res.data.item_codes

    if (!likedCodes.length) {
      setProducts([])
      setLoading(false)
      return
    }

    // Create likedMap
    const map = {}
    likedCodes.forEach(code => {
      map[code] = true
    })
    setLikedMap(map)

    // Fetch full product data
    return axios.post(
      `${import.meta.env.VITE_DJANGO_URL}/wishlist-products/`,
      { item_codes: likedCodes }
    )

  })
  .then(res => {
    if (res) {
      setProducts(res.data.products)
    }
  })
  .catch(err => {
    console.error("Wishlist fetch error:", err)
  })
  .finally(() => setLoading(false))

}, [navigate])

// useEffect(() => {
//   if (likedCodes.length === 0) {
//     setProducts([])
//     setLoading(false)
//     return
//   }

//   setLoading(true)

//   axios.post("http://localhost:8000/api/wishlist-products/", {
//       item_codes: likedCodes
//   })
//   .then(res => {
//       setProducts(res.data.products)
//   })
//   .catch(err => console.error(err))
//   .finally(() => setLoading(false))

// }, [likedMap])

// For add to cart and adding qtys
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

function openNutrition(e, product) {
  e.stopPropagation()
  setShowBack(false)   // Always start with front image
  setSelectedNutrition(product)
}

function closeNutritionModal() {
  setSelectedNutrition(null)
}function increaseQty(p) {
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

function toggleLike(code) {

  const token = localStorage.getItem("token")

  if (!token) {
    navigate("/login")
    return
  }

  axios.post(
    `${import.meta.env.VITE_DJANGO_URL}/wishlist/toggle/`,
    { item_code: code },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )
  .then(res => {

    if (res.data.status === "removed") {

      setLikedMap(prev => {
        const updated = { ...prev }
        delete updated[code]
        return updated
      })

      setProducts(prev => prev.filter(p => p.item_code !== code))

    }

  })
  .catch(err => {
    console.error("Toggle error:", err)
  })
}

  return (
    <div className="site-root">
      <header className="site-header">
        <div className="header-inner">
          <div className="brand" onClick={() => navigate('/') }>
            <div className="logo-mark">🌿</div>
            <div className="brand-name">StarBazar</div>
          </div>
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
                        navigate('/orders')
                        setShowUserMenu(false)
                      }}
                    >
                      � Your Orders
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

      <main className="container">
        {/* Wishlist hero/banner - uses public/unnamed.png */}
        <div className="hero-banner wishlist-hero" role="banner" aria-label="Wishlist banner">
          <div className="hero-overlay" />
          <div className="hero-content">
            <h1>Your Favorites,<br /> <span className="hero-accent">Always Fresh</span></h1>
            <p>Get the best quality groceries delivered to your doorstep. Save more on your weekly favorites.</p>
            <div className="hero-actions">
              <button className="carousel-btn" onClick={() => navigate('/allproducts')}>Shop Now →</button>
            </div>
          </div>
        </div>

        <section className="best-sellers">
          <h3>Your Wishlist</h3>

                    {loading ? (
            <p>Loading...</p>
            ) : products.length === 0 ? (
            <div className="no-products">
                <p>Your wishlist is empty. Add products by tapping the heart on product cards.</p>
            </div>
            ) : (
            <div className="grid">
                {products.map(p => (
                <article key={p.item_code} className="product-card-full">
                    <div className="product-img-container large">
                      <div className="product-img-front">
                        <div className="product-img">
                          {p.image ? (
                            <img src={`${import.meta.env.VITE_FRAPPE_URL}${p.image}`} alt={p.item_code} />
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
                      className={`heart-btn ${likedMap[p.item_code] ? 'liked' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleLike(p.item_code) }}
                      title={likedMap[p.item_code] ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      {likedMap[p.item_code] ? '❤' : '🤍'}
                    </button>
                    <div className="product-body-full">
                      <div className="product-name-full">{p.item_name}</div>
                      <div className="product-price-full">
                        ${p.price.toFixed(2)} <span className="unit">/ {p.unit}</span>
                      </div>
                      {p.availability === 'out-of-stock' ? (
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
                          <button className="qty-btn-full plus" onClick={() => increaseQty(p)} disabled={(cart[p.item_code]?.qty || 0) >= p.stock}>+</button>
                        </div>
                      )}
                    </div>
                </article>
                ))}
            </div>
            )}
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
                      src={`${import.meta.env.VITE_FRAPPE_URL}${
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
      </main>

      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-left">© {new Date().getFullYear()} StarBazar — Fresh groceries delivered.</div>
        </div>
      </footer>
    </div>
  )
}

export default Wishlist
