import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Problems from './pages/Problems'
import ProblemSolver from './pages/ProblemSolver'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import TopicStats from './pages/TopicStats'
import ListPage from './pages/ListPage'
import Contests from './pages/Contests'
import ContestDetail from './pages/ContestDetail'
import ContestArena from './pages/ContestArena'

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/problems" element={<ProtectedRoute><Problems /></ProtectedRoute>} />
      <Route path="/problems/:id" element={<ProtectedRoute><ProblemSolver /></ProtectedRoute>} />
      <Route path="/profile/:username" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/topic/:topicName" element={<ProtectedRoute><TopicStats /></ProtectedRoute>} />
      <Route path="/list/:listId" element={<ProtectedRoute><ListPage /></ProtectedRoute>} />
      <Route path="/contests" element={<ProtectedRoute><Contests /></ProtectedRoute>} />
      <Route path="/contests/:contestId" element={<ProtectedRoute><ContestDetail /></ProtectedRoute>} />
      <Route path="/contests/:contestId/arena" element={<ProtectedRoute><ContestArena /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
