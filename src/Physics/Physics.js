import SubjectHub from '../components/SubjectHub';

const Physics = () => (
  <SubjectHub
    title="Physics"
    description="Unravel the mysteries of energy and matter."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Physics' }]}
    topics={[
      { to: '/home/physics/astrophysics', icon: 'fas fa-star', title: 'Astrophysics', description: 'The properties and behavior of celestial bodies and the universe.' },
      { to: '/home/physics/electromagnetics', icon: 'fas fa-bolt', title: 'Electromagnetics', description: 'The study of interactions between electric and magnetic fields.' },
      { to: '/home/physics/quantumMechanics', icon: 'fas fa-atom', title: 'Quantum Mechanics', description: 'The principles underlying the fundamental quantum theory of physics.' },
      { to: '/home/physics/thermodynamics', icon: 'fas fa-lightbulb', title: 'Thermodynamics', description: 'Principles governing the relationships between forms of energy.' },
    ]}
  />
);

export default Physics;
