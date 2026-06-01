import TopicPage from '../../components/TopicPage';

const OrganicChemistry = () => (
  <TopicPage
    subject="OrganicChemistry"
    title="Organic Chemistry"
    description="The study of carbon-containing compounds and their applications."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Chemistry', to: '/home/chemistry' }, { label: 'Organic Chemistry' }]}
  />
);

export default OrganicChemistry;
