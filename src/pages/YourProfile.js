// Sample data, you can replace this with actual user data
const YourProfile = () => {
    return <h1>YourProfile</h1>;
  };
  
  export default YourProfile;

const userData = {
    name: 'John Smith',
    score: 150
};

// Update user profile with JavaScript
document.getElementById('userName').textContent = userData.name;
document.getElementById('userScore').textContent = userData.score;
