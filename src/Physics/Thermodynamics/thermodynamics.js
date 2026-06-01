import TopicPage from '../../components/TopicPage';

const Thermodynamics = () => (
  <TopicPage
    subject="Thermodynamics"
    title="Thermodynamics"
    description="The principles governing the relationships between forms of energy."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Physics', to: '/home/physics' }, { label: 'Thermodynamics' }]}
  />
);

export default Thermodynamics;
