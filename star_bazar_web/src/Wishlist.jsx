import React, { useEffect, useState } from 'react'
import axios from 'axios'
import './Home.css'
import { useNavigate } from 'react-router-dom'

function Wishlist() {
  const [likedMap, setLikedMap] = useState({})
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('liked')) || {}
      setLikedMap(saved)
    } catch (e) {
      setLikedMap({})
    }
  }, [])

  useEffect(() => {
    // Fetch all products for matching item_code -> product details
    // We'll call the same API used elsewhere. If paginated, request a large page_size to get all.
    setLoading(true)
    axios.get('http://localhost:8000/api/all-products/', { params: { page: 1, page_size: 1000 } })
      .then(res => {
        const formatted = res.data.products.map((item, index) => ({
          id: index + 1,
          item_code: item.item_code,
          name: item.item_name,
          price: parseFloat(item.price),
          unit: `/ ${item.unit}`,
          category: item.category || 'General',
          brand: null,
          image: item.image,
          stock: item.stock,
          availability: item.stock > 0 ? 'in-stock' : 'out-of-stock'
        }))

        // Filter to only liked products
        const likedCodes = Object.keys(likedMap).filter(k => likedMap[k])
        const likedProducts = formatted.filter(p => likedCodes.includes(p.item_code))
        setProducts(likedProducts)
      })
      .catch(err => {
        console.error('Error fetching products for wishlist', err)
      })
      .finally(() => setLoading(false))
  }, [likedMap])

  function toggleLike(code) {
    setLikedMap(prev => {
      const next = { ...prev, [code]: !prev[code] }
      try { localStorage.setItem('liked', JSON.stringify(next)) } catch (e) {}
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
            <button className="icon-btn" onClick={() => navigate('/checkout')}>🛒</button>
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

                  <div className="product-img large">{p.image ? <img src={`http://192.168.29.249:8000/${p.image}`} alt={p.item_code} /> : '🛍️'}</div>
                  <div className="product-body">
                    <div className="product-name">{p.name}</div>
                    <div className="product-price">${p.price.toFixed(2)} <span className="unit">{p.unit}</span></div>
                    {p.availability === 'out-of-stock' ? (
                      <button className="add-btn disabled-btn" disabled>Out of Stock</button>
                    ) : (
                      <button className="add-btn" onClick={() => {
                        // simple add to cart behavior
                        const cart = JSON.parse(localStorage.getItem('cart')) || {}
                        cart[p.item_code] = { item: p, qty: (cart[p.item_code]?.qty || 0) + 1 }
                        localStorage.setItem('cart', JSON.stringify(cart))
                        // navigate to checkout or give feedback
                        alert('Added to cart')
                      }}>Add to Cart</button>
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
