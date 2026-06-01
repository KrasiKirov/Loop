import SubjectHub from '../components/SubjectHub';

const Chemistry = () => (
  <SubjectHub
    title="Chemistry"
    description="Dive into the world of atoms and reactions."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Chemistry' }]}
    topics={[
      { to: '/home/chemistry/biochemistry', icon: 'fas fa-leaf', title: 'Biochemistry', description: 'The chemical processes and substances that occur in living organisms.' },
      { to: '/home/chemistry/organicChemistry', icon: 'fas fa-dna', title: 'Organic Chemistry', description: 'The study of carbon-containing compounds and their applications.' },
      { to: '/home/chemistry/inorganicChemistry', icon: 'fas fa-atom', title: 'Inorganic Chemistry', description: 'The study of compounds that lack carbon-hydrogen bonds.' },
      { to: '/home/chemistry/analyticalChemistry', icon: 'fas fa-flask', title: 'Analytical Chemistry', description: 'The analysis of the composition of matter through various techniques.' },
    ]}
  />
);

export default Chemistry;
