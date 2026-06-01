import TopicPage from '../../components/TopicPage';

const Astrophysics = () => (
  <TopicPage
    subject="Astrophysics"
    title="Astrophysics"
    description="The properties and behavior of celestial bodies and the universe."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Physics', to: '/home/physics' }, { label: 'Astrophysics' }]}
  />
);

export default Astrophysics;
