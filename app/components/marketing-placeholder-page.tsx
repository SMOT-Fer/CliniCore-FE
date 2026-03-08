import MarketingNavbar from './marketing-navbar';
import MarketingFooter from './marketing-footer';
import '../css/marketing.css';
import '../css/landing.css';

type Props = {
  title: string;
  description: string;
};

export default function MarketingPlaceholderPage({ title, description }: Props) {
  return (
    <main className="marketing-shell">
      <MarketingNavbar />
      <section className="marketing-page">
        <article className="marketing-placeholder">
          <h1>{title}</h1>
          <p>{description}</p>
        </article>
      </section>
      <MarketingFooter />
    </main>
  );
}
