import TopicPage from '../../components/TopicPage';

const Physiology = () => (
  <TopicPage
    subject="Physiology"
    title="Physiology"
    description="The functions and activities of living organisms and their response to environmental stimuli."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Biology', to: '/home/biology' }, { label: 'Physiology' }]}
  />
);

export default Physiology;
