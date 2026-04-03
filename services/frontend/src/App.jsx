import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import useAuthStore from './store/authStore'
import useContestStore from './store/contestStore'
import useProblemStore from './store/problemStore'
import Admin from './pages/Admin'
import Connections from './pages/Connections'
import ContestArena from './pages/ContestArena'
import ContestDetail from './pages/ContestDetail'
import Contests from './pages/Contests'
import IntegratedConsole from './pages/IntegratedConsole'
import Landing from './pages/Landing'
import ListPage from './pages/ListPage'
import Login from './pages/Login'
import Notes from './pages/Notes'
import Problems from './pages/Problems'
import ProblemSolver from './pages/ProblemSolver'
import Profile from './pages/Profile'
import Register from './pages/Register'
import Settings from './pages/Settings'

function WorkspaceBootstrap({ children }) {
  const user = useAuthStore((state) => state.user)
  const syncProblems = useProblemStore((state) => state.syncProblems)
  const syncContests = useContestStore((state) => state.syncContests)

  useEffect(() => {
    if (!user?.username) return
    syncProblems(user.username)
    syncContests()
  }, [syncContests, syncProblems, user?.username])

  return children
}

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isHydrating = useAuthStore((state) => state.isHydrating)

  if (isHydrating) return null

  return isAuthenticated ? <WorkspaceBootstrap>{children}</WorkspaceBootstrap> : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isHydrating = useAuthStore((state) => state.isHydrating)
  const user = useAuthStore((state) => state.user)

  if (isHydrating) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return user?.isAdmin ? <WorkspaceBootstrap>{children}</WorkspaceBootstrap> : <Navigate to="/problems?domain=DSA" replace />
}

function SelfProfileRedirect() {
  const user = useAuthStore((state) => state.user)

  if (!user?.username) {
    return <Navigate to="/problems?domain=DSA" replace />
  }

  return <Navigate to={`/profile/${encodeURIComponent(user.username)}`} replace />
}

function PublicOnlyRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isHydrating = useAuthStore((state) => state.isHydrating)

  if (isHydrating) return null

  return isAuthenticated ? <Navigate to="/problems?domain=DSA" replace /> : children
}

export default function App() {
  const hydrateSession = useAuthStore((state) => state.hydrateSession)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isHydrating = useAuthStore((state) => state.isHydrating)

  useEffect(() => {
    hydrateSession()
  }, [hydrateSession])

  if (isHydrating) {
    return null
  }

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/problems?domain=DSA" replace /> : <Landing />} />
      <Route path="/landing" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

      <Route path="/problems" element={<ProtectedRoute><Problems /></ProtectedRoute>} />
      <Route path="/problems/:id" element={<ProtectedRoute><ProblemSolver /></ProtectedRoute>} />
      <Route path="/contests" element={<ProtectedRoute><Contests /></ProtectedRoute>} />
      <Route path="/contests/:contestId" element={<ProtectedRoute><ContestDetail /></ProtectedRoute>} />
      <Route path="/contests/:contestId/arena" element={<ProtectedRoute><ContestArena /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><SelfProfileRedirect /></ProtectedRoute>} />
      <Route path="/profile/:username" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/profile/:username/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
      <Route path="/list/:listId" element={<ProtectedRoute><ListPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/console" element={<AdminRoute><IntegratedConsole /></AdminRoute>} />
      <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
