import TopicPage from '../../components/TopicPage';

const QuantumMechanics = () => (
  <TopicPage
    subject="QuantumMechanics"
    title="Quantum Mechanics"
    description="The principles underlying the fundamental quantum theory of physics."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Physics', to: '/home/physics' }, { label: 'Quantum Mechanics' }]}
  />
);

export default QuantumMechanics;
