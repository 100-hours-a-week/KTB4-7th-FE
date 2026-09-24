import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { SignupPage } from '../pages/SignupPage'
import { SolutionPage } from '../pages/SolutionPage'
import { SolutionDetailPage } from '../pages/SolutionDetailPage'
import { MySolutionsPage } from '../pages/MySolutionsPage'
import { SolutionChatPage } from '../pages/SolutionChatPage'
import { LoginPage } from '../pages/LoginPage'
import { PasswordResetPage } from '../pages/PasswordResetPage'
import { NotificationsPage } from '../pages/NotificationsPage'
import { ProfilePage } from '../pages/ProfilePage'
import { SalesUploadPage } from '../pages/SalesUploadPage'
import { SalesAnalysisPage } from '../pages/SalesAnalysisPage'

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
  { path: '/solution', element: <SolutionPage /> },
  { path: '/solution/:solutionId', element: <SolutionDetailPage /> },
  { path: '/solution/:solutionId/chat', element: <SolutionChatPage /> },
  { path: '/my-solutions', element: <MySolutionsPage /> },
  { path: '/notifications', element: <NotificationsPage /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/sales/upload', element: <SalesUploadPage /> },
  { path: '/sales/analysis', element: <SalesAnalysisPage /> },
])
