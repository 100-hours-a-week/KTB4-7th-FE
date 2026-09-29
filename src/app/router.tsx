import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { SignupPage } from '../pages/SignupPage'
import { SolutionPage } from '../pages/SolutionPage'
import { SolutionDetailPage } from '../pages/SolutionDetailPage'
import { MySolutionsPage } from '../pages/MySolutionsPage'
import { MySolutionDetailPage } from '../pages/MySolutionDetailPage'
import { SolutionChatPage } from '../pages/SolutionChatPage'
import { LoginPage } from '../pages/LoginPage'
import { PasswordResetPage } from '../pages/PasswordResetPage'
import { NotificationsPage } from '../pages/NotificationsPage'
import { NotificationSettingsPage } from '../pages/NotificationSettingsPage'
import { ProfilePage } from '../pages/ProfilePage'
import { PasswordChangePage } from '../pages/PasswordChangePage'
import { StoreProfilePage } from '../pages/StoreProfilePage'
import { SalesUploadPage } from '../pages/SalesUploadPage'
import { SalesAnalysisPage } from '../pages/SalesAnalysisPage'
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/password-reset', element: <PasswordResetPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/solution', element: <SolutionPage /> },
      { path: '/solution/:bundleId/:cardId', element: <SolutionDetailPage /> },
      { path: '/solution/chat', element: <SolutionChatPage /> },
      { path: '/my-solutions', element: <MySolutionsPage /> },
      { path: '/my-solutions/:savedId', element: <MySolutionDetailPage /> },
      { path: '/notifications', element: <NotificationsPage /> },
      {
        path: '/notifications/settings',
        element: <NotificationSettingsPage />,
      },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/profile/password', element: <PasswordChangePage /> },
      { path: '/profile/store', element: <StoreProfilePage /> },
      { path: '/sales/upload', element: <SalesUploadPage /> },
      { path: '/sales/analysis', element: <SalesAnalysisPage /> },
    ],
  },
])
