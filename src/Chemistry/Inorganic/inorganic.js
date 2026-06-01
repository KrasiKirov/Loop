import TopicPage from '../../components/TopicPage';

const InorganicChemistry = () => (
  <TopicPage
    subject="InorganicChemistry"
    title="Inorganic Chemistry"
    description="The study of compounds that lack carbon-hydrogen bonds."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Chemistry', to: '/home/chemistry' }, { label: 'Inorganic Chemistry' }]}
  />
);

export default InorganicChemistry;
