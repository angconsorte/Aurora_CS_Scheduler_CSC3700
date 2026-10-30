import { NavLink } from 'react-router-dom'

export default function NavBar() {
    const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`

    return (
        <nav className="navbar navbar-expand navbar-dark bg-dark">
            <div className="container">
                <NavLink className="navbar-brand" to="/">Aurora CS Scheduler</NavLink>
                <div className="navbar-nav">
                    <NavLink className={linkClass} to="/" end>Home</NavLink>
                    <NavLink className={linkClass} to="/about">About</NavLink>
                </div>
            </div>
        </nav>
    )
}
