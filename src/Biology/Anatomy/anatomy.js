import TopicPage from '../../components/TopicPage';

const Anatomy = () => (
  <TopicPage
    subject="Anatomy"
    title="Anatomy"
    description="The structure and organization of living organisms."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Biology', to: '/home/biology' }, { label: 'Anatomy' }]}
  />
);

export default Anatomy;
