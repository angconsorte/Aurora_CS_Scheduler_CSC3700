import { version } from '../../package.json'

export default function AboutPage() {
    const today = new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

    return (
        <div className="about-page container">
            <h1 className="home-page_title">About</h1>
            <p>Aurora CS Course Scheduler tracks completed courses and shows which courses are available next based on prerequisites.</p>
            <ul className="list-unstyled">
                <li><strong>Authors:</strong> Angelo Consorte, Jocelyn Sahagun</li>
                <li><strong>Date:</strong> {today}</li>
                <li><strong>Version:</strong> {version}</li>
            </ul>
        </div>
    )
}
