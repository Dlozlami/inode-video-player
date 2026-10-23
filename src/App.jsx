import { HashRouter, Routes, Route } from 'react-router-dom'
import { VaultProvider } from './store/VaultContext'
import Library  from './pages/Library'
import Player   from './pages/Player'
import Settings from './pages/Settings'
import './App.css'

export default function App() {
  return (
    <VaultProvider>
      <HashRouter>
        <Routes>
          <Route path="/"               element={<Library />}  />
          <Route path="/player/:inode"  element={<Player />}   />
          <Route path="/settings"       element={<Settings />} />
        </Routes>
      </HashRouter>
    </VaultProvider>
  )
}
