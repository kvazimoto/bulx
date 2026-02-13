import './App.css'
import { useLocation } from "react-router-dom";
import { Routes, Route } from 'react-router-dom'
import { useState } from 'react';
import ExchangePage from './pages/ExchangePage/ExchangePage'
import Header from './main_components/Header/Header'
import Footer from './main_components/Footer/Footer';
import OrderPage from './pages/OrderPage/OrderPage'
import ChatFloating from './chat/ChatFloating/ChatFloating'
import AdminChatsList from './pages/AdminChatsList/AdminChatsList'
import AdminChatThread from './pages/AdminChatThread/AdminChatThread'
import AdminGate from './admin/AdminGate'
import MediaHeader from './main_components/MediaHeader/MediaHeader';
import MediaMenu from './main_components/MediaMenu/MediaMenu';
import ExchangeRull from './pages/ExchangeRull/ExchangeRull';
import AmlKyc from './pages/AmlKyc/AmlKyc';
import PrivacyPolicy from './pages/PrivacyPolicy/PrivacyPolicy';
import OurPartners from './pages/OurPartners/OurPartners';
import General from './pages/FAQ/General';
import Service from './pages/FAQ/Service';
import ExchFaq from './pages/FAQ/ExchFaq';
import Other from './pages/FAQ/Other';
import ContactPage from './pages/ContactPage/ContactPage';

import PartnersPage from './pages/PartnersPage/PartnersPage';

import { useMediaQuery } from './hooks/useMediaQuery';

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin/");
  const isMobile = useMediaQuery("(max-width: 1100px)")
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      
      <ChatFloating />

      <section className="main-container">
        {isMobile 
          ? 
            <>
              <MediaHeader onOpenMenu={() => setMenuOpen(true)} />
              <MediaMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
            </>
          : 
            <Header />
        }
        
        <Routes>
          <Route path='/' element={<ExchangePage />} />
          <Route path="/order/:publicId" element={<OrderPage />} />
          <Route path="/admin/chats" element={<AdminGate><AdminChatsList /></AdminGate>} />
          <Route path="/admin/chats/:clientId" element={<AdminGate><AdminChatThread /></AdminGate>} />  

          <Route path="/terms_and_conditions" element={<ExchangeRull />} /> 
          <Route path="/aml-policy" element={<AmlKyc />} /> 
          <Route path="/privacy-policy" element={<PrivacyPolicy />} /> 
          <Route path="/our-partners" element={<OurPartners />} /> 
          <Route path="/faq" element={<General />} /> 
          <Route path="/faq/service_questions" element={<Service />} /> 
          <Route path="/faq/exchange_requests" element={<ExchFaq />} /> 
          <Route path="/faq/different_issues" element={<Other />} /> 

          <Route path="/partners" element={<PartnersPage />} /> 
          <Route path="/contacts" element={<ContactPage />} /> 
        </Routes>
      </section>

      <Footer />
    </>
  )
}

export default App
