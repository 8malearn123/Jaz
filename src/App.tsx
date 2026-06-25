import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { ShopPage } from '@/pages/ShopPage'
import { ProductPage } from '@/pages/ProductPage'
import { CollectionsPage } from '@/pages/CollectionsPage'
import { CorporatePage } from '@/pages/CorporatePage'
import { HeritagePage } from '@/pages/HeritagePage'
import { CartPage } from '@/pages/CartPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { AccountPage } from '@/pages/AccountPage'
import { BusinessPage } from '@/pages/BusinessPage'
import { AdminConsole } from '@/pages/AdminConsole'
import { RolePicker } from '@/pages/RolePicker'
import { SignInPage } from '@/pages/SignInPage'
import { SignUpPage } from '@/pages/SignUpPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RequireAuth } from '@/components/account/RequireAuth'

export default function App() {
  return (
    <Routes>
      {/* Standalone launcher — no storefront chrome */}
      <Route path="roles" element={<RolePicker />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="product/:slug" element={<ProductPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="corporate" element={<CorporatePage />} />
        <Route path="heritage" element={<HeritagePage />} />
        <Route path="cart" element={<CartPage />} />
        <Route
          path="checkout"
          element={
            <RequireAuth titleKey="auth.gate.checkoutTitle" bodyKey="auth.gate.checkoutBody" explore={false}>
              <CheckoutPage />
            </RequireAuth>
          }
        />
        <Route path="account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="business" element={<RequireAuth><BusinessPage /></RequireAuth>} />
        <Route path="admin" element={<RequireAuth><AdminConsole /></RequireAuth>} />
        <Route path="signin" element={<SignInPage />} />
        <Route path="signup" element={<SignUpPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
