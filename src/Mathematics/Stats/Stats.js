import TopicPage from '../../components/TopicPage';

const Stats = () => (
  <TopicPage
    subject="Statistics"
    title="Probability & Statistics"
    description="From elementary statistical tools to advanced probabilities and statistical methods."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Mathematics', to: '/home/math' }, { label: 'Statistics' }]}
  />
);

export default Stats;
