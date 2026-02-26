import { useState } from 'react'
import React from 'react'
import './Products.css'
import { useNavigate } from "react-router-dom";
import { useEffect } from 'react'
import axios from 'axios'

function Products({ selectedCategory = null, onNavigate }) {
  // Enhanced product data with categories, brands, and prices
const [allProducts, setAllProducts] = useState([])

const navigate=useNavigate();
// const cartObject = location.state?.cart || {};
// const offers = location.state?.offers || [];

// Convert object → array (REAL cart)
// const cart = Object.values(cartObject);
const [specialOffers,setSpecialOffers]=useState([])
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

  // const [quantities, setQuantities] = useState({})
  // const [addingToCart, setAddingToCart] = useState({})
  const [liked, setLiked] = useState({})
  const [filters, setFilters] = useState({
    category: selectedCategory || 'all',
    priceRange: [0, 15],
    brand: 'all',
    availability: 'all',
    searchTerm: ''
  })
  const [sortBy, setSortBy] = useState('price-low')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  // const itemsPerPage = 12

  // Get unique brands
  const brands = ['all', ...new Set(allProducts.map(p => p.brand))]
  const categories = ['all', ...new Set(allProducts.map(p => p.category))]

  // 
  
  function increaseQty(product) {
  const key = product.item_code
  console.log("Current Product Code:", product.item_code)
  setCart(prev => ({
    ...prev,
    [key]: {
      item: product,
      qty: (prev[key]?.qty || 0) + 1
    }
  }))
}

function decreaseQty(product) {
  const key = product.item_code

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

  function toggleLike(productId) {
    setLiked(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }))
  }

  // Filter products
  // let filteredProducts = allProducts.filter(p => {
  //   const categoryMatch = filters.category === 'all' || p.category === filters.category
  //   const priceMatch = p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
  //   const brandMatch = filters.brand === 'all' || p.brand === filters.brand
  //   const availabilityMatch = filters.availability === 'all' || p.availability === filters.availability
  //   const searchMatch = p.name.toLowerCase().includes(filters.searchTerm.toLowerCase())

  //   return categoryMatch && priceMatch && brandMatch && availabilityMatch && searchMatch
  // })

  // Sort products
  // if (sortBy === 'price-low') {
  //   allProducts.sort((a, b) => a.price - b.price)
  // } else if (sortBy === 'price-high') {
  //   allProducts.sort((a, b) => b.price - a.price)
  // } else if (sortBy === 'name') {
  //   allProducts.sort((a, b) => a.name.localeCompare(b.name))
  // }

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
    setCurrentPage(1)
  }

  const handlePriceChange = (value) => {
    setFilters(prev => ({
      ...prev,
      priceRange: value
    }))
  }

  const resetFilters = () => {
    setFilters({
      category: selectedCategory || 'all',
      priceRange: [0, 15],
      brand: 'all',
      availability: 'all',
      searchTerm: ''
    })
    setCurrentPage(1)
  }

  useEffect(() => {
  axios.get("http://localhost:8000/api/all-products/", {
    params: {
      page: currentPage,
      page_size: 12,
      category: filters.category,
      search: filters.searchTerm,
      min_price: filters.priceRange[0],
      max_price: filters.priceRange[1],
      availability: filters.availability,
      sort_by: sortBy
    }
  })
  .then(res => {
    const formatted = res.data.products.map((item, index) => ({
      id: index + 1,
      item_code: item.item_code,
      name: item.item_name,
      price: parseFloat(item.price),
      unit: `/ ${item.unit}`,
      category: item.category || "General",
      brand: null,
      image: item.image,
      stock: item.stock,
      availability: item.stock > 0 ? "in-stock" : "out-of-stock"
    }))

    setAllProducts(formatted)
    setTotalPages(Math.ceil(res.data.total_count / 12))
    setTotalCount(res.data.total_count)  
  })
  .catch(err => console.error(err))

}, [currentPage, filters, sortBy])

  return (
    <div className="site-root">
      <header className="site-header">
        <div className="header-inner">
          <div className="brand" onClick={() => onNavigate && onNavigate('home')}>
            <div className="logo-mark">🌿</div>
            <div className="brand-name">StarBazar</div>
          </div>
          <div className="search">
            <input
              placeholder="Search for products..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            />
          </div>
          <nav className="header-actions">
            <button className="icon-btn">❤</button>
            <button className="icon-btn" onClick={() => goToCheckout()}>🛒 <span className="cart-count">{Object.values(cart).reduce((total, item) => total + item.qty, 0)}</span></button>
          </nav>
        </div>
      </header>

      <section className="products-hero">
        <div className="hero-overlay"></div>
        <div className="hero-content-products">
          <h1>Shop All Products</h1>
          <p>Browse our complete collection of fresh groceries</p>
          <div className="hero-categories">
            {['Home','Shop All','Contact Us'].map((c) => (
              <button 
                key={c} 
                className={`hero-cat-btn ${c === 'Shop All' ? 'active' : ''}`}
                onClick={() => {
                  if (c === 'Home') {
                    navigate('/')
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

      <main className="products-container">
        <aside className="filters-sidebar">
          <div className="filters-header">
            <h3>Filters</h3>
            <button className="reset-btn" onClick={resetFilters}>Reset</button>
          </div>

          {/* Category Filter */}
          <div className="filter-group">
            <h4 className="filter-title">Categories</h4>
            {/* Custom scrollable category list for better UX when there are many categories */}
            <div className="filter-list" role="listbox" aria-label="Categories">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`filter-item ${filters.category === cat ? 'active' : ''}`}
                  onClick={() => handleFilterChange('category', cat)}
                  role="option"
                  aria-selected={filters.category === cat}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Sort By (moved below Categories) */}
          <div className="filter-group">
            <h4 className="filter-title">Sort by</h4>
            <select
              id="sort-sidebar"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="low_to_high">Price: Low to High</option>
              <option value="high_to_low">Price: High to Low</option>
            </select>
          </div>

          {/* Removed: Price Range, Brand, Availability filters per request */}
        </aside>

        <section className="products-main">
          <div className="products-top-bar">
            <div className="results-count">
              {totalCount} product{allProducts.length !== 1 ? 's' : ''} found
            </div>
          </div>

          {allProducts.length === 0 ? (
            <div className="no-products">
              <p>No products found matching your filters.</p>
              <button className="reset-btn-large" onClick={resetFilters}>Reset Filters</button>
            </div>
          ) : (
            <div className="products-grid">
              {allProducts.map(product => (
                <article key={product.item_code} className="product-card-full">
                  <div className="product-img-full">
                    {product.emoji}
                  </div>
                  <button 
                    className={`heart-btn ${liked[product.id] ? 'liked' : ''}`}
                    onClick={() => toggleLike(product.id)}
                    title={liked[product.id] ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {liked[product.id] ? '❤' : '🤍'}
                  </button>
                  <div className="product-body-full">
                    <div className="product-name-full">{product.name}</div>
                    <div className="product-brand">{product.brand}</div>
                    <div className="product-price-full">
                      ${product.price.toFixed(2)} <span className="unit">{product.unit}</span>
                    </div>
                    {product.availability === 'out-of-stock' ? (
                      <button className="add-btn-full disabled-btn" disabled>
                        Out of Stock
                      </button>
                    ) : !cart[product.item_code] ? (
                      <button 
                        className="add-btn-full"
                        onClick={() => increaseQty(product)}
                      >
                        Add to Cart
                      </button>
                    ) : (
                      <div className="qty-selector-full">
                        <button className="qty-btn-full minus" onClick={() => decreaseQty(product)}>−</button>
                        <div className="qty-display-full">
                          <span className="qty-value-full">{cart[product.item_code].qty}</span>
                        </div>
                        <button className="qty-btn-full plus" onClick={() => increaseQty(product)}>+</button>
                        {/* <button className="confirm-add-btn-full" onClick={() => handleConfirmAddToCart(product)}>Add to Cart</button> */}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {allProducts.length > 0 && totalPages > 1 && (
            <div className="pagination">
              <button 
                className="pagination-btn" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>
              <div className="pagination-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          )}
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

export default Products