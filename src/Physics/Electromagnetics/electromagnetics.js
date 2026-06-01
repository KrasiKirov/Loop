import TopicPage from '../../components/TopicPage';

const Electromagnetics = () => (
  <TopicPage
    subject="Electromagnetics"
    title="Electromagnetics"
    description="The study of interactions between electric and magnetic fields."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Physics', to: '/home/physics' }, { label: 'Electromagnetics' }]}
  />
);

export default Electromagnetics;
