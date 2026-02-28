import React, { useEffect, useState } from 'react'
import axios from 'axios'
import './Home.css'
import { useNavigate } from 'react-router-dom'

function Wishlist() {
  const [likedMap, setLikedMap] = useState({})
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const[specialOffers,setSpecialOffers]=useState([])
  const navigate = useNavigate()

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

  useEffect(() => {
  const saved = JSON.parse(localStorage.getItem('liked')) || {}
  setLikedMap(saved)
}, [])

useEffect(() => {
  const saved = JSON.parse(localStorage.getItem('liked')) || {}
  const likedCodes = Object.keys(saved).filter(k => saved[k])

  if (likedCodes.length === 0) {
    setProducts([])
    setLoading(false)
    return
  }

  setLoading(true)

  axios.post("http://localhost:8000/api/wishlist-products/", {
      item_codes: likedCodes
  })
  .then(res => {
      setProducts(res.data.products)
  })
  .catch(err => console.error(err))
  .finally(() => setLoading(false))

}, [likedMap])

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

function toggleLike(code) {
    setLikedMap(prev => {
        const next = { ...prev, [code]: !prev[code] }
        try { localStorage.setItem('liked', JSON.stringify(next)) } catch (e) {console.log(e)}
        return next
    })

// remove from products state immediately for snappy UI
setProducts(prev => prev.filter(p => p.item_code !== code))
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
          </nav>
        </div>
      </header>

      <main className="container">
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
                <article key={p.item_code} className="product-card">
                    <button
                    type="button"
                    className={`heart-btn ${likedMap[p.item_code] ? 'liked' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleLike(p.item_code) }}
                    title={likedMap[p.item_code] ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                    {likedMap[p.item_code] ? '❤' : '🤍'}
                    </button>

                    <div className="product-img large">
                    {p.image ? (
                        <img
                        src={`http://groceryv15.localhost:8001/${p.image}`}
                        alt={p.item_code}
                        />
                    ) : (
                        '🛍️'
                    )}
                    </div>

                    <div className="product-body">
                    <div className="product-name">{p.item_name}</div>

                    <div className="product-price">
                        ${p.price.toFixed(2)} <span className="unit">{p.unit}</span>
                    </div>

                    {p.availability === 'out-of-stock' ? (
                        <button className="add-btn disabled-btn" disabled>
                        Out of Stock
                        </button>
                    ) : cart[p.item_code] ? (
                        <div className="qty-selector">
                        <button className="qty-btn minus" onClick={() => decreaseQty(p)}>−</button>

                        <div className="qty-display">
                            <span className="qty-value">
                            {cart[p.item_code]?.qty || 0}
                            </span>
                        </div>

                        <button className="qty-btn plus" onClick={() => increaseQty(p)}>+</button>
                        </div>
                    ) : (
                        <button className="add-btn" onClick={() => increaseQty(p)}>
                        Add to Cart
                        </button>
                    )}
                    </div>
                </article>
                ))}
            </div>
            )}
        </section>
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
