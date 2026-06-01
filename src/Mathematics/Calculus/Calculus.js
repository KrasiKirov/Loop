import TopicPage from '../../components/TopicPage';

const Calculus = () => (
  <TopicPage
    subject="Calculus"
    title="Calculus"
    description="From single variable limits to multivariable and vector calculus."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Mathematics', to: '/home/math' }, { label: 'Calculus' }]}
  />
);

export default Calculus;
