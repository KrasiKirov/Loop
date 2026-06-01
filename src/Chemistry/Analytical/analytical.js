import TopicPage from '../../components/TopicPage';

const AnalyticalChemistry = () => (
  <TopicPage
    subject="AnalyticalChemistry"
    title="Analytical Chemistry"
    description="The analysis of the composition of matter through various techniques."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Chemistry', to: '/home/chemistry' }, { label: 'Analytical Chemistry' }]}
  />
);

export default AnalyticalChemistry;
