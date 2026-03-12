import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Orders.css'
import './Home.css'
import axios from 'axios'

// const STATIC_ORDERS = [
//   {
//     id: 'SB-98321',
//     date: 'Oct 24, 2023',
//     status: 'DELIVERED',
//     total: 245.99,
//     items: [
//       {
//         name: 'Nike Air Max Velocity',
//         details: 'Size: 10.5 | Color: Crimson Red',
//         price: 129.99,
//         qty: 1,
//         image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&h=120&fit=crop',
//       },
//       {
//         name: 'Minimalist Quartz Watch',
//         details: 'Silver Mesh Band | 40mm',
//         price: 85.00,
//         qty: 1,
//         image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&h=120&fit=crop',
//       },
//       {
//         name: 'Professional Studio Headphones',
//         details: 'Color: Matte Black',
//         price: 31.00,
//         qty: 1,
//         image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&h=120&fit=crop',
//       },
//     ],
//   },
//   {
//     id: 'SB-97442',
//     date: 'Oct 28, 2023',
//     status: 'SHIPPED',
//     total: 59.00,
//     items: [
//       {
//         name: 'Ergonomic Mouse Pad XL',
//         details: 'Color: Slate Grey | Non-slip base',
//         price: 59.00,
//         qty: 1,
//         image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=120&h=120&fit=crop',
//       },
//     ],
//   },
//   {
//     id: 'SB-96105',
//     date: 'Sep 15, 2023',
//     status: 'PROCESSING',
//     total: 134.50,
//     items: [
//       {
//         name: 'Urban Daypack Backpack',
//         details: 'Color: Olive Green | 30L',
//         price: 89.50,
//         qty: 1,
//         image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=120&h=120&fit=crop',
//       },
//       {
//         name: 'Insulated Water Bottle',
//         details: 'Size: 750ml | Color: Midnight Blue',
//         price: 45.00,
//         qty: 1,
//         image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=120&h=120&fit=crop',
//       },
//     ],
//   },
// ]
export default function Orders() {
  const [orders, setOrders] = useState([])
  const [expandedOrders, setExpandedOrders] = useState({})

  useEffect(() => {

    const token = localStorage.getItem("token")

    axios.get("http://localhost:8000/api/orders/", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(res => {
      setOrders(res.data)
    })
    .catch(err => console.log(err))

  }, [])

  const toggleOrder = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }))
  }
  // 'Delivered', 'Processing', 'Shipped'
  const STATUS_TABS = ['All']

  const DATE_OPTIONS = ['Last 3 months', 'Last 6 months', 'This year', 'All time']

  const navigate = useNavigate()
  const [activeTab, setActiveTab]       = useState('All')
  const [search, setSearch]             = useState('')
  const [dateFilter, setDateFilter]     = useState('Last 3 months')
  const [showDateMenu, setShowDateMenu] = useState(false)

  const currentUser = localStorage.getItem('username')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    navigate('/login')
  }

  async function handleReorder(order) {
    try {

      const itemCodes = order.items.map(i => i.item_code)

      const res = await axios.post(
        "http://localhost:8000/api/products-by-codes/",
        { item_codes: itemCodes }
      )

      const products = res.data.products
      const cart = JSON.parse(localStorage.getItem("cart")) || {}

      products.forEach(product => {

        const orderItem = order.items.find(
          i => i.item_code === product.item_code
        )
        if (!orderItem) return

        const qty = orderItem.qty
        const key = product.item_code

        if (cart[key]) {
          cart[key].qty += qty
        } else {
          cart[key] = {
            item: product,
            qty: qty
          }
        }

      })

      localStorage.setItem("cart", JSON.stringify(cart))
      window.dispatchEvent(new Event("storage"))

    } catch (err) {
      console.log(err)
    }
  }

  const filtered = orders.filter(order => {
    const matchTab =
      activeTab === 'All' ||
      order.status === activeTab.toUpperCase()
    const matchSearch =
      search.trim() === '' ||
      order.id.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  return (
    <div className="orders-root">
      {/* ── Header ── */}
      <header className="site-header">
        <div className="header-inner">
          <div className="brand" onClick={() => navigate('/')}>
            <div className="logo-mark">🌿</div>
            <div className="brand-name">StarBazar</div>
          </div>
          <nav className="header-actions">
            <button className="icon-btn" onClick={() => navigate('/wishlist')}>❤</button>
            {currentUser ? (
              <span className="user-profile-btn" style={{ cursor: 'default' }}>
                <span className="user-avatar">👤</span>
                <span className="user-name">{currentUser}</span>
              </span>
            ) : (
              <button className="icon-btn login-btn" onClick={() => navigate('/login')}>🔐 Login</button>
            )}
          </nav>
        </div>
      </header>

      {/* ── Page Body ── */}
      <div className="orders-page">

        {/* ── Sidebar ── */}
        <aside className="orders-sidebar">
          <div className="sidebar-account">
            <div className="sidebar-account-icon">👤</div>
            <div>
              <div className="sidebar-account-title">My Account</div>
              <div className="sidebar-account-sub">Manage your orders</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button className="sidebar-nav-item active">
              <span className="sidebar-nav-icon">📦</span> Orders
            </button>
            <button className="sidebar-nav-item" onClick={() => navigate('/wishlist')}>
              <span className="sidebar-nav-icon">❤️</span> Wishlist
            </button>
          </nav>

          <div className="sidebar-divider" />

          <nav className="sidebar-nav">
            <button className="sidebar-nav-item logout" onClick={handleLogout}>
              <span className="sidebar-nav-icon">🚪</span> Logout
            </button>
          </nav>
        </aside>

        {/* ── Main ── */}
        <main className="orders-main">

          {/* Title row */}
          <div className="orders-title-row">
            <div>
              <h1 className="orders-title">Your Orders</h1>
              <p className="orders-subtitle">Track, return, or buy items again</p>
            </div>
            {/* Date filter */}
            <div className="date-filter-wrapper">
              <button
                className="date-filter-btn"
                onClick={() => setShowDateMenu(p => !p)}
              >
                <span>📅</span> {dateFilter} <span className="dropdown-arrow">▼</span>
              </button>
              {showDateMenu && (
                <div className="date-filter-menu">
                  {DATE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      className={`date-filter-option ${dateFilter === opt ? 'active' : ''}`}
                      onClick={() => { setDateFilter(opt); setShowDateMenu(false) }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="orders-search-bar">
            <span className="orders-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by Order ID or Product Name"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Status tabs */}
          <div className="orders-tabs">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                className={`orders-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Orders list */}
          {filtered.length === 0 ? (
            <div className="orders-empty">
              <p>No orders found.</p>
            </div>
          ) : (
            filtered.map(order => {
              const isExpanded = !!expandedOrders[order.id]
              return (
                <div key={order.id} className={`order-card ${isExpanded ? 'expanded' : ''}`}>

                  {/* Card header — clickable to toggle */}
                  <div
                    className="order-card-header"
                    onClick={() => toggleOrder(order.id)}
                    role="button"
                    aria-expanded={isExpanded}
                  >
                    <div className="order-meta">
                      <div className="order-meta-group">
                        <span className="order-meta-label">ORDER ID</span>
                        <span className="order-meta-value order-id-value">#{order.id}</span>
                      </div>
                      <div className="order-meta-group">
                        <span className="order-meta-label">DATE PLACED</span>
                        <span className="order-meta-value">{order.date}</span>
                      </div>
                      <div className="order-meta-group">
                        <span className="order-meta-label">TOTAL</span>
                        <span className="order-meta-value">${order.total.toFixed(2)}</span>
                      </div>
                      <div className="order-meta-group">
                        <span className="order-meta-label">TIME</span>
                        <span className="order-meta-value">{order.time}</span>
                      </div>
                      <div className="order-meta-group">
                        <span className="order-meta-label">ITEMS</span>
                        <span className="order-items-pill">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    </div>

                    <div className="order-card-actions">
                      <button
                        className="order-btn-solid"
                        onClick={async (e) => {
                          e.stopPropagation()
                          await handleReorder(order)
                          navigate('/checkout')
                        }}>
                        Reorder
                      </button>
                      <button
                        className="order-expand-btn"
                        aria-label={isExpanded ? 'Collapse order' : 'Expand order'}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleOrder(order.id)
                        }}
                      >
                        <span className={`expand-chevron ${isExpanded ? 'rotated' : ''}`}>▼</span>
                      </button>
                    </div>
                  </div>

                  {/* Card body — collapsible items */}
                  <div className={`order-items-collapse ${isExpanded ? 'open' : ''}`}>
                    {/* Scrollable wrapper so long order item lists show a scrollbar */}
                    <div className="order-items-scroll">
                      <div className="order-items-list">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="order-item-row">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="order-item-img"
                            />
                            <div className="order-item-info">
                              <div className="order-item-name">{item.name}</div>
                              <div className="order-item-details">{item.details}</div>
                            </div>
                            <div className="order-item-price-block">
                              <span className="order-item-price">${item.price.toFixed(2)}</span>
                              <span className="order-item-qty">Qty: {item.qty}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )
            })
          )}
        </main>
      </div>

      {/* ── Footer ── */}
      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-left">© {new Date().getFullYear()} StarBazar — Fresh groceries delivered.</div>
        </div>
      </footer>
    </div>
  )
}
