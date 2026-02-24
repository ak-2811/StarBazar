import { useState } from 'react'
import React from 'react'
import './Products.css'
import { useNavigate } from "react-router-dom";
import { useEffect } from 'react'
import axios from 'axios'

function Products({ selectedCategory = null, onNavigate, onAddToCart }) {
  // Enhanced product data with categories, brands, and prices
  // const allProducts = [
  //   { id: 1, name: 'Red Apples', price: 2.99, unit: '/ lb', category: 'Fruits', brand: 'FarmFresh', emoji: '🍎', availability: 'in-stock' },
  //   { id: 2, name: 'Organic Milk', price: 3.49, unit: '/ l', category: 'Dairy', brand: 'OrganicDairy', emoji: '🥛', availability: 'in-stock' },
  //   { id: 3, name: 'Potato Chips', price: 1.99, unit: '/ pc', category: 'Snacks', brand: 'CrunchyBites', emoji: '🥔', availability: 'in-stock' },
  //   { id: 4, name: 'Fresh Chicken', price: 5.99, unit: '/ lb', category: 'Proteins', brand: 'FreshMeat', emoji: '🍗', availability: 'in-stock' },
  //   { id: 5, name: 'Bananas', price: 1.29, unit: '/ lb', category: 'Fruits', brand: 'TropicalFarm', emoji: '🍌', availability: 'in-stock' },
  //   { id: 6, name: 'Cheddar Cheese', price: 4.59, unit: '/ 200g', category: 'Dairy', brand: 'DairyPro', emoji: '🧀', availability: 'in-stock' },
  //   { id: 7, name: 'Blueberry Yogurt', price: 2.49, unit: '/ cup', category: 'Dairy', brand: 'YogurtDelight', emoji: '🍯', availability: 'in-stock' },
  //   { id: 8, name: 'Frozen Pizza', price: 6.99, unit: '/ pc', category: 'Frozen', brand: 'FrozenBites', emoji: '🍕', availability: 'low-stock' },
  //   { id: 9, name: 'Broccoli', price: 2.49, unit: '/ bunch', category: 'Vegetables', brand: 'GreenFields', emoji: '🥦', availability: 'in-stock' },
  //   { id: 10, name: 'Orange Juice', price: 3.99, unit: '/ l', category: 'Beverages', brand: 'FreshPress', emoji: '🧃', availability: 'in-stock' },
  //   { id: 11, name: 'Maggi Whole Wheat Pack of 3', price: 1.49, unit: '/ pack', category: 'Snacks', brand: 'Maggi', emoji: '📦', availability: 'in-stock' },
  //   { id: 12, name: 'Spinach', price: 2.19, unit: '/ bunch', category: 'Vegetables', brand: 'GreenFields', emoji: '🥬', availability: 'in-stock' },
  //   { id: 13, name: 'Tomatoes', price: 1.79, unit: '/ lb', category: 'Vegetables', brand: 'FarmFresh', emoji: '🍅', availability: 'in-stock' },
  //   { id: 14, name: 'Carrots', price: 1.49, unit: '/ lb', category: 'Vegetables', brand: 'GreenFields', emoji: '🥕', availability: 'in-stock' },
  //   { id: 15, name: 'Salmon Fillet', price: 8.99, unit: '/ lb', category: 'Proteins', brand: 'FreshMeat', emoji: '🐟', availability: 'in-stock' },
  //   { id: 16, name: 'Beef Steak', price: 12.99, unit: '/ lb', category: 'Proteins', brand: 'PremiumMeat', emoji: '🥩', availability: 'low-stock' },
  //   { id: 17, name: 'Greek Yogurt', price: 3.29, unit: '/ 500g', category: 'Dairy', brand: 'GreekDelight', emoji: '🍚', availability: 'in-stock' },
  //   { id: 18, name: 'Mozzarella', price: 5.49, unit: '/ 250g', category: 'Dairy', brand: 'DairyPro', emoji: '🧀', availability: 'in-stock' },
  //   { id: 19, name: 'Apple Juice', price: 2.99, unit: '/ l', category: 'Beverages', brand: 'FreshPress', emoji: '🍎', availability: 'in-stock' },
  //   { id: 20, name: 'Coca Cola', price: 1.99, unit: '/ 500ml', category: 'Beverages', brand: 'CocaCola', emoji: '🥤', availability: 'in-stock' },
  //   { id: 21, name: 'Ice Cream', price: 4.99, unit: '/ 500ml', category: 'Frozen', brand: 'FrozenyDelight', emoji: '🍦', availability: 'in-stock' },
  //   { id: 22, name: 'Frozen Vegetables', price: 3.49, unit: '/ bag', category: 'Frozen', brand: 'FrozenBites', emoji: '❄️', availability: 'in-stock' },
  //   { id: 23, name: 'Peanuts', price: 2.79, unit: '/ 200g', category: 'Snacks', brand: 'CrunchyBites', emoji: '🥜', availability: 'out-of-stock' },
  //   { id: 24, name: 'Chocolate Bar', price: 1.29, unit: '/ pc', category: 'Snacks', brand: 'SweetTreats', emoji: '🍫', availability: 'in-stock' },
  // ]
const [allProducts, setAllProducts] = useState([])

const navigate=useNavigate();
const cartObject = location.state?.cart || {};
// const offers = location.state?.offers || [];

// Convert object → array (REAL cart)
const cart = Object.values(cartObject);

  const [quantities, setQuantities] = useState({})
  const [addingToCart, setAddingToCart] = useState({})
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

  function handleAddToCartClick(p) {
    setAddingToCart(prev => ({
      ...prev,
      [p.id]: true
    }))
    if (!quantities[p.id]) {
      setQuantities(prev => ({
        ...prev,
        [p.id]: 1
      }))
    }
  }

  function handleIncreaseQty(p) {
    setQuantities(prev => ({
      ...prev,
      [p.id]: (prev[p.id] || 1) + 1
    }))
  }

  function handleDecreaseQty(p) {
    setQuantities(prev => ({
      ...prev,
      [p.id]: Math.max(1, (prev[p.id] || 1) - 1)
    }))
  }

  function handleConfirmAddToCart(p) {
    const qty = quantities[p.id] || 1
    onAddToCart(p, qty)
    setAddingToCart(prev => ({
      ...prev,
      [p.id]: false
    }))
    setQuantities(prev => ({
      ...prev,
      [p.id]: 1
    }))
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
            <button className="icon-btn" onClick={() => onNavigate('checkout')}>🛒 <span className="cart-count"></span></button>
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
                    ) : !addingToCart[product.id] ? (
                      <button 
                        className="add-btn-full"
                        onClick={() => handleAddToCartClick(product)}
                      >
                        Add to Cart
                      </button>
                    ) : (
                      <div className="qty-selector-full">
                        <button className="qty-btn-full minus" onClick={() => handleDecreaseQty(product)}>−</button>
                        <div className="qty-display-full">
                          <span className="qty-value-full">{quantities[product.id] || 1}</span>
                        </div>
                        <button className="qty-btn-full plus" onClick={() => handleIncreaseQty(product)}>+</button>
                        <button className="confirm-add-btn-full" onClick={() => handleConfirmAddToCart(product)}>Add to Cart</button>
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