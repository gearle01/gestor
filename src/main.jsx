import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Substitua pela sua chave pública do Stripe
const stripePromise = loadStripe('pk_live_51SWnap2UNhTPKWTwurKyH0z5A9ZX5xoTrISOthbRHBUZ596KHOCIy0JBGeqTRWrWnmKRyCsubJTbcwoU4aJ4bWoa00oVq70CGo');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Elements stripe={stripePromise}>
      <App />
    </Elements>
  </StrictMode>,
)
