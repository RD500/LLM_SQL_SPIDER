import { useState, useEffect } from 'react';
import './App.css';

const MCControlVisualization = () => {
  // Environment configuration
  const [environment, setEnvironment] = useState('gridworld');
  const [epsilon, setEpsilon] = useState(0.2);
  const [episodeCount, setEpisodeCount] = useState(0);
  const [speed, setSpeed] = useState(1000); // ms between steps
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState('initialize');
  const [episode, setEpisode] = useState([]);
  const [returns, setReturns] = useState({});
  const [qValues, setQValues] = useState({});
  const [policy, setPolicy] = useState({});
  const [gridSize, setGridSize] = useState(4);
  const [currentState, setCurrentState] = useState(null);
  const [currentAction, setCurrentAction] = useState(null);
  const [returnValue, setReturnValue] = useState(null);
  const [visitedPairs, setVisitedPairs] = useState([]);
  const [visitedStates, setVisitedStates] = useState([]);
  const [rewardLocations, setRewardLocations] = useState([]);
  const [penaltyLocations, setPenaltyLocations] = useState([]);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  
  // GridWorld setup
  useEffect(() => {
    if (environment === 'gridworld') {
      initializeGridWorld();
    }
  }, [environment, gridSize]);

  const initializeGridWorld = () => {
    // Reset everything
    setEpisodeCount(0);
    setCurrentStep('initialize');
    setEpisode([]);
    setVisitedPairs([]);
    setVisitedStates([]);
    setCurrentState(null);
    setCurrentAction(null);
    setReturnValue(null);
    
    // Create states
    const allStates = [];
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        allStates.push(`${i},${j}`);
      }
    }
    
    // Create Q-values, returns, and policy
    const newQValues = {};
    const newReturns = {};
    const newPolicy = {};
    
    const actions = ['up', 'down', 'left', 'right'];
    
    allStates.forEach(state => {
      newQValues[state] = {};
      newReturns[state] = {};
      newPolicy[state] = {};
      
      actions.forEach(action => {
        // Initialize Q values to random values between -0.1 and 0.1
        newQValues[state][action] = (Math.random() * 0.2 - 0.1).toFixed(2);
        // Initialize returns as empty arrays
        newReturns[state][action] = [];
        // Initialize with ε-soft policy (equal probability)
        newPolicy[state][action] = (1/actions.length).toFixed(2);
      });
    });
    
    setQValues(newQValues);
    setReturns(newReturns);
    setPolicy(newPolicy);
    
    // Set random reward and penalty locations
    const newRewardLocations = [];
    const newPenaltyLocations = [];
    
    // Add one reward location at random
    const rewardX = Math.floor(Math.random() * gridSize);
    const rewardY = Math.floor(Math.random() * gridSize);
    newRewardLocations.push(`${rewardX},${rewardY}`);
    
    // Add one penalty location at random (different from reward)
    let penaltyX, penaltyY;
    do {
      penaltyX = Math.floor(Math.random() * gridSize);
      penaltyY = Math.floor(Math.random() * gridSize);
    } while (penaltyX === rewardX && penaltyY === rewardY);
    
    newPenaltyLocations.push(`${penaltyX},${penaltyY}`);
    
    setRewardLocations(newRewardLocations);
    setPenaltyLocations(newPenaltyLocations);
  };

  // Algorithm Steps
  const runStep = () => {
    if (currentStep === 'initialize') {
      setCurrentStep('generate_episode');
    } else if (currentStep === 'generate_episode') {
      generateEpisode();
      setCurrentStep('process_episode');
    } else if (currentStep === 'process_episode') {
      processEpisode();
      setCurrentStep('update_policy');
    } else if (currentStep === 'update_policy') {
      updatePolicy();
      setEpisodeCount(episodeCount + 1);
      setCurrentStep('generate_episode');
    }
  };

  // Run continuously
  useEffect(() => {
    let timer;
    if (isRunning) {
      timer = setTimeout(runStep, speed / animationSpeed);
    }
    return () => clearTimeout(timer);
  }, [isRunning, currentStep, speed, animationSpeed]);

  // Generate an episode using current policy
  const generateEpisode = () => {
    const newEpisode = [];
    const newVisitedPairs = [];
    const newVisitedStates = [];
    
    // Start from a random state
    let i = Math.floor(Math.random() * gridSize);
    let j = Math.floor(Math.random() * gridSize);
    let state = `${i},${j}`;
    
    // Episode ends when reaching a terminal state or after 100 steps
    let step = 0;
    let terminated = false;
    
    while (!terminated && step < 100) {
      // Select action based on current policy
      const action = selectAction(state);
      
      // Get next state and reward
      const [nextState, reward] = getNextStateAndReward(state, action);
      
      // Add step to episode
      newEpisode.push({
        state,
        action,
        reward,
        nextState
      });
      
      newVisitedPairs.push(`${state}-${action}`);
      if (!newVisitedStates.includes(state)) newVisitedStates.push(state);
      
      // Check for termination
      if (rewardLocations.includes(nextState) || penaltyLocations.includes(nextState)) {
        terminated = true;
      }
      
      // Move to next state
      state = nextState;
      step++;
    }
    
    setEpisode(newEpisode);
    setVisitedPairs(newVisitedPairs);
    setVisitedStates(newVisitedStates);
    setCurrentState(null);
  };

  // Select action using ε-soft policy
  const selectAction = (state) => {
    const actions = Object.keys(policy[state]);
    
    // With probability 1-ε+ε/|A(s)| select the greedy action
    // With probability ε/|A(s)| select each non-greedy action
    const rand = Math.random();
    
    // Find best action for this state
    let bestAction = null;
    let bestValue = -Infinity;
    
    for (const action of actions) {
      if (parseFloat(qValues[state][action]) > bestValue) {
        bestValue = parseFloat(qValues[state][action]);
        bestAction = action;
      }
    }
    
    // Probability of selecting greedy action
    const greedyProb = 1 - epsilon + (epsilon / actions.length);
    
    if (rand < greedyProb) {
      return bestAction;
    } else {
      // Select random non-greedy action
      const nonGreedyActions = actions.filter(a => a !== bestAction);
      const randIndex = Math.floor(Math.random() * nonGreedyActions.length);
      return nonGreedyActions[randIndex];
    }
  };

  // Simulate environment dynamics
  const getNextStateAndReward = (state, action) => {
    const [i, j] = state.split(',').map(Number);
    
    // Add some randomness to make it stochastic
    const rand = Math.random();
    
    let newI = i;
    let newJ = j;
    
    // 80% chance to go in the selected direction
    // 20% chance to go in a random direction
    if (rand < 0.8) {
      if (action === 'up') newI = Math.max(0, i - 1);
      else if (action === 'down') newI = Math.min(gridSize - 1, i + 1);
      else if (action === 'left') newJ = Math.max(0, j - 1);
      else if (action === 'right') newJ = Math.min(gridSize - 1, j + 1);
    } else {
      // Random direction
      const randDir = Math.floor(Math.random() * 4);
      if (randDir === 0) newI = Math.max(0, i - 1);
      else if (randDir === 1) newI = Math.min(gridSize - 1, i + 1);
      else if (randDir === 2) newJ = Math.max(0, j - 1);
      else if (randDir === 3) newJ = Math.min(gridSize - 1, j + 1);
    }
    
    const nextState = `${newI},${newJ}`;
    
    // Calculate reward
    let reward = -0.1; // Small negative reward for each step
    
    if (rewardLocations.includes(nextState)) {
      reward = 1.0; // Positive reward for reaching goal
    } else if (penaltyLocations.includes(nextState)) {
      reward = -1.0; // Negative reward for hitting penalty
    }
    
    return [nextState, reward];
  };

  // Process episode to compute returns and update Q-values
  const processEpisode = () => {
    const newReturns = { ...returns };
    const newQValues = { ...qValues };
    
    // Calculate returns working backward from the end
    let G = 0;
    const gamma = 0.9; // Discount factor
    
    // For each (state, action) pair in the episode
    const processedPairs = [];
    
    for (let t = episode.length - 1; t >= 0; t--) {
      const step = episode[t];
      const { state, action, reward } = step;
      const pair = `${state}-${action}`;
      
      // Update return
      G = reward + gamma * G;
      
      // First-visit MC: if this is the first occurrence of (s,a)
      if (!processedPairs.includes(pair)) {
        processedPairs.push(pair);
        
        // Add the return to the list
        if (!newReturns[state][action]) {
          newReturns[state][action] = [];
        }
        newReturns[state][action].push(G);
        
        // Update Q(s,a) with the average of returns
        const avg = newReturns[state][action].reduce((sum, val) => sum + val, 0) / newReturns[state][action].length;
        newQValues[state][action] = avg.toFixed(2);
        
        setCurrentState(state);
        setCurrentAction(action);
        setReturnValue(G.toFixed(2));
      }
    }
    
    setReturns(newReturns);
    setQValues(newQValues);
  };

  // Update policy to be ε-soft
  const updatePolicy = () => {
    const newPolicy = { ...policy };
    
    // For each state that appeared in the episode
    visitedStates.forEach(state => {
      const actions = Object.keys(newPolicy[state]);
      
      // Find action with max Q-value
      let bestAction = null;
      let bestValue = -Infinity;
      
      actions.forEach(action => {
        const value = parseFloat(qValues[state][action]);
        if (value > bestValue) {
          bestValue = value;
          bestAction = action;
        }
      });
      
      // Update policy to be ε-soft
      actions.forEach(action => {
        if (action === bestAction) {
          // Greedy action gets 1-ε+ε/|A(s)|
          newPolicy[state][action] = (1 - epsilon + epsilon / actions.length).toFixed(2);
        } else {
          // Non-greedy actions get ε/|A(s)|
          newPolicy[state][action] = (epsilon / actions.length).toFixed(2);
        }
      });
    });
    
    setPolicy(newPolicy);
    setCurrentState(null);
    setCurrentAction(null);
    setReturnValue(null);
  };

  // Calculate the color intensity based on Q-value for visualization
  const getColorIntensity = (state, action) => {
    if (!qValues[state] || !qValues[state][action]) return 'bg-gray-100';
    
    const val = parseFloat(qValues[state][action]);
    
    if (val > 0) {
      // Green for positive values
      const intensity = Math.min(Math.abs(val) * 100, 900);
      return `bg-green-${Math.floor(intensity / 100) * 100 || 100}`;
    } else {
      // Red for negative values
      const intensity = Math.min(Math.abs(val) * 100, 900);
      return `bg-red-${Math.floor(intensity / 100) * 100 || 100}`;
    }
  };

  // Get policy arrow direction and opacity
  const getPolicyArrow = (state, action) => {
    if (!policy[state] || !policy[state][action]) return null;
    
    const prob = parseFloat(policy[state][action]);
    const opacity = Math.max(0.2, prob);
    
    let arrowChar = '';
    if (action === 'up') arrowChar = '↑';
    else if (action === 'down') arrowChar = '↓';
    else if (action === 'left') arrowChar = '←';
    else if (action === 'right') arrowChar = '→';
    
    return (
      <span className="absolute" style={{ opacity }}>
        {arrowChar}
      </span>
    );
  };

  // Format state for display
  const formatState = (i, j) => `${i},${j}`;

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">On-Policy First-Visit Monte Carlo Control</h1>
        <div className="flex gap-2 items-center">
          <span>Episodes: {episodeCount}</span>
          <span>Step: {currentStep.replace('_', ' ')}</span>
        </div>
      </div>
      
      <div className="flex gap-4">
        <div className="flex flex-col gap-4 w-1/3">
          <div className="p-4 bg-gray-50 rounded shadow">
            <h2 className="font-bold mb-2">Controls</h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label>ε value:</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={epsilon}
                  disabled={isRunning}
                  onChange={(e) => setEpsilon(parseFloat(e.target.value))} 
                  className="w-32"
                />
                <span>{epsilon.toFixed(1)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <label>Grid Size:</label>
                <input 
                  type="range" 
                  min="3" 
                  max="6" 
                  step="1" 
                  value={gridSize}
                  disabled={isRunning}
                  onChange={(e) => setGridSize(parseInt(e.target.value))} 
                  className="w-32"
                />
                <span>{gridSize}x{gridSize}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <label>Speed:</label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="5" 
                  step="0.5" 
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))} 
                  className="w-32"
                />
                <span>{animationSpeed}x</span>
              </div>
              
              <div className="flex justify-between mt-2">
                <button 
                  onClick={() => setIsRunning(!isRunning)} 
                  className={`px-4 py-2 rounded ${isRunning ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
                >
                  {isRunning ? 'Pause' : 'Start'}
                </button>
                
                <button 
                  onClick={runStep} 
                  disabled={isRunning}
                  className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
                >
                  Step
                </button>
                
                <button 
                  onClick={initializeGridWorld} 
                  className="px-4 py-2 bg-gray-500 text-white rounded"
                  disabled={isRunning}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded shadow">
            <h2 className="font-bold mb-2">Algorithm Steps</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li className={currentStep === 'initialize' ? 'font-bold text-blue-600' : ''}>
                Initialize Q(s,a) arbitrarily, Returns(s,a) as empty lists
              </li>
              <li className={currentStep === 'generate_episode' ? 'font-bold text-blue-600' : ''}>
                Generate an episode using π (ε-soft policy)
              </li>
              <li className={currentStep === 'process_episode' ? 'font-bold text-blue-600' : ''}>
                For each (s,a) pair in the episode:
                <ul className="list-disc list-inside ml-4 text-sm">
                  <li>Get return G following first occurrence</li>
                  <li>Append G to Returns(s,a)</li>
                  <li>Update Q(s,a) ← average(Returns(s,a))</li>
                </ul>
              </li>
              <li className={currentStep === 'update_policy' ? 'font-bold text-blue-600' : ''}>
                For each state s, update policy:
                <ul className="list-disc list-inside ml-4 text-sm">
                  <li>a* ← argmax<sub>a</sub> Q(s,a)</li>
                  <li>π(a|s) ← 1-ε+ε/|A(s)| if a=a*</li>
                  <li>π(a|s) ← ε/|A(s)| if a≠a*</li>
                </ul>
              </li>
            </ol>
          </div>
          
          <div className="p-4 bg-gray-50 rounded shadow overflow-auto max-h-48">
            <h2 className="font-bold mb-2">Episode</h2>
            {episode.length > 0 ? (
              <ol className="list-decimal list-inside text-xs space-y-1">
                {episode.map((step, idx) => (
                  <li key={idx} className={visitedPairs.indexOf(`${step.state}-${step.action}`) === idx ? 'font-bold' : ''}>
                    State: {step.state}, Action: {step.action}, Reward: {step.reward}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm italic">No episode generated yet</p>
            )}
          </div>
          
          {currentState && (
            <div className="p-4 bg-gray-50 rounded shadow">
              <h2 className="font-bold mb-2">Current Update</h2>
              <div className="text-sm">
                <p>State: {currentState}</p>
                <p>Action: {currentAction}</p>
                <p>Return (G): {returnValue}</p>
                <p>Q(s,a): {qValues[currentState]?.[currentAction]}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 bg-gray-50 rounded shadow">
              <h2 className="font-bold mb-2">Environment</h2>
              <div className="grid" style={{ 
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                gap: '1px'
              }}>
                {Array.from({ length: gridSize }).map((_, i) => (
                  Array.from({ length: gridSize }).map((_, j) => {
                    const state = formatState(i, j);
                    return (
                      <div 
                        key={state} 
                        className={`aspect-square border ${
                          rewardLocations.includes(state) ? 'bg-green-200 border-green-500' : 
                          penaltyLocations.includes(state) ? 'bg-red-200 border-red-500' : 
                          'bg-white border-gray-300'
                        } flex items-center justify-center relative text-xs`}
                      >
                        <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                          <div className={`flex items-center justify-center ${getColorIntensity(state, 'up')}`}>
                            {getPolicyArrow(state, 'up')}
                          </div>
                          <div className={`flex items-center justify-center ${getColorIntensity(state, 'right')}`}>
                            {getPolicyArrow(state, 'right')}
                          </div>
                          <div className={`flex items-center justify-center ${getColorIntensity(state, 'left')}`}>
                            {getPolicyArrow(state, 'left')}
                          </div>
                          <div className={`flex items-center justify-center ${getColorIntensity(state, 'down')}`}>
                            {getPolicyArrow(state, 'down')}
                          </div>
                        </div>
                        <div className="absolute text-xs font-bold">
                          {currentState === state && '⚪'}
                          {rewardLocations.includes(state) && '🎯'}
                          {penaltyLocations.includes(state) && '❌'}
                        </div>
                      </div>
                    );
                  })
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded shadow">
              <h2 className="font-bold mb-2">Q-Values</h2>
              <div className="overflow-auto max-h-52">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="border p-1">State</th>
                      <th className="border p-1">Up</th>
                      <th className="border p-1">Down</th>
                      <th className="border p-1">Left</th>
                      <th className="border p-1">Right</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(qValues).map(state => (
                      <tr key={state} className={visitedStates.includes(state) ? 'bg-blue-50' : ''}>
                        <td className="border p-1">{state}</td>
                        <td className="border p-1">{qValues[state]?.up}</td>
                        <td className="border p-1">{qValues[state]?.down}</td>
                        <td className="border p-1">{qValues[state]?.left}</td>
                        <td className="border p-1">{qValues[state]?.right}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded shadow">
              <h2 className="font-bold mb-2">Policy π(a|s)</h2>
              <div className="overflow-auto max-h-52">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="border p-1">State</th>
                      <th className="border p-1">Up</th>
                      <th className="border p-1">Down</th>
                      <th className="border p-1">Left</th>
                      <th className="border p-1">Right</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(policy).map(state => (
                      <tr key={state} className={visitedStates.includes(state) ? 'bg-blue-50' : ''}>
                        <td className="border p-1">{state}</td>
                        <td className="border p-1">{policy[state]?.up}</td>
                        <td className="border p-1">{policy[state]?.down}</td>
                        <td className="border p-1">{policy[state]?.left}</td>
                        <td className="border p-1">{policy[state]?.right}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded shadow">
        <h2 className="font-bold mb-2">Legend & Explanation</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-sm">Grid Colors</h3>
            <ul className="list-disc list-inside text-sm">
              <li><span className="inline-block w-3 h-3 bg-green-500"></span> Green cell background: Positive Q-values</li>
              <li><span className="inline-block w-3 h-3 bg-red-500"></span> Red cell background: Negative Q-values</li>
              <li><span className="inline-block">🎯</span> Target/reward location</li>
              <li><span className="inline-block">❌</span> Penalty location</li>
              <li><span className="inline-block">⚪</span> Current state being updated</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-sm">ε-soft Policy</h3>
            <p className="text-sm">Each cell shows action probabilities with arrows. The darker the arrow, the higher the probability of taking that action in the state.</p>
            <p className="text-sm mt-1">For ε-soft policies:</p>
            <ul className="list-disc list-inside text-sm">
              <li>Best action probability: 1-ε+ε/|A(s)|</li>
              <li>Other actions probability: ε/|A(s)|</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCControlVisualization;