import Home from './Home'
import { Routes, Route, Navigate } from 'react-router-dom'
import Products from './Products'
import Checkout from './Checkout'
// import { useEffect } from "react";
// import { testConnection } from "./services/api";

function App() {
  return(
    <Routes>
      <Route path='/' element={<Home />} />
      <Route path='/allproducts' element={<Products />} />
      <Route path='/checkout' element={<Checkout />} />
      

    </Routes>
  )

}


export default App;
