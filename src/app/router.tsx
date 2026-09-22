import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { SignupPage } from '../pages/SignupPage'
import { SolutionPage } from '../pages/SolutionPage'
import { SolutionDetailPage } from '../pages/SolutionDetailPage'
import { MySolutionsPage } from '../pages/MySolutionsPage'
import { SolutionChatPage } from '../pages/SolutionChatPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  { path: '/solution', element: <SolutionPage /> },
  { path: '/solution/:solutionId', element: <SolutionDetailPage /> },
  { path: '/solution/:solutionId/chat', element: <SolutionChatPage /> },
  { path: '/my-solutions', element: <MySolutionsPage /> },
])
