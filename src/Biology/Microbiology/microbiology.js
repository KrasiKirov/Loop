import TopicPage from '../../components/TopicPage';

const Microbiology = () => (
  <TopicPage
    subject="Microbiology"
    title="Microbiology"
    description="The study of microscopic organisms."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Biology', to: '/home/biology' }, { label: 'Microbiology' }]}
  />
);

export default Microbiology;
