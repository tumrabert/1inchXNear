const hre = require('hardhat');

module.exports = async ({ getNamedAccounts, deployments }) => {
    console.log('🚀 Deploying Fusion+ Near Extension contracts to Sepolia...');
    
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    
    console.log('Deployer address:', deployer);
    console.log('Network:', hre.network.name);

    // Deploy SimpleLimitOrderProtocol first
    console.log('\n📄 Deploying SimpleLimitOrderProtocol...');
    const limitOrderProtocol = await deploy('SimpleLimitOrderProtocol', {
        from: deployer,
        args: [],
        log: true,
        gasLimit: 5000000,
    });

    console.log('✅ SimpleLimitOrderProtocol deployed to:', limitOrderProtocol.address);

    // Deploy FusionNearExtension
    console.log('\n📄 Deploying FusionNearExtension...');
    const fusionExtension = await deploy('FusionNearExtension', {
        from: deployer,
        args: [],
        log: true,
        gasLimit: 3000000,
    });

    console.log('✅ FusionNearExtension deployed to:', fusionExtension.address);

    // Authorize the extension as a resolver in the protocol
    console.log('\n🔧 Setting up contract integration...');
    const extensionContract = await hre.ethers.getContractAt('FusionNearExtension', fusionExtension.address);
    
    // The deployer is already authorized as a resolver by default
    console.log('✅ Extension setup complete');

    console.log('\n📋 Deployment Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SimpleLimitOrderProtocol:', limitOrderProtocol.address);
    console.log('FusionNearExtension:     ', fusionExtension.address);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n🔗 Explorer Links:');
    console.log('SimpleLimitOrderProtocol:', `https://sepolia.etherscan.io/address/${limitOrderProtocol.address}`);
    console.log('FusionNearExtension:     ', `https://sepolia.etherscan.io/address/${fusionExtension.address}`);

    // Verify contracts if not on localhost
    if (hre.network.name !== 'hardhat' && hre.network.name !== 'localhost') {
        console.log('\n🔍 Verifying contracts on Etherscan...');
        
        try {
            await hre.run('verify:verify', {
                address: limitOrderProtocol.address,
                constructorArguments: [],
            });
            console.log('✅ SimpleLimitOrderProtocol verified');
        } catch (error) {
            console.log('❌ SimpleLimitOrderProtocol verification failed:', error.message);
        }

        try {
            await hre.run('verify:verify', {
                address: fusionExtension.address,
                constructorArguments: [],
            });
            console.log('✅ FusionNearExtension verified');
        } catch (error) {
            console.log('❌ FusionNearExtension verification failed:', error.message);
        }
    }

    return {
        limitOrderProtocol: limitOrderProtocol.address,
        fusionExtension: fusionExtension.address
    };
};

module.exports.tags = ['FusionExtension'];