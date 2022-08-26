import React, {useEffect, useRef, useState} from 'react';
import Head from 'next/head';
import Web3Modal from 'web3modal';
import styles from '../../styles/Presale.module.css';
import {Contract, utils, providers} from 'ethers';
import {cryptoDevsAbi, CRYPTO_DEVS_CONTRACT_ADDRESS} from '../../constants';

export default function Presale() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [presaleStarted, setPresaleStarted] = useState(false);
  const [presaleEnded, setPresaleEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [tokenIdsMinted, setTokenIdsMinted] = useState('0');
  const web3ModalRef = useRef();

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4 && chainId !== 5) {
      window.alert("Change the network to Rinkeby or Goerli");
      throw new Error("Change network to Rinkeby or Goerli");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  const connectWallet = async () => {
    try {
      getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  }

  const getCryptoDevsContractInstance = async (needSigner = false) => {
    const provider = await getProviderOrSigner(needSigner);
    const cryptoDevsContract = new Contract(
      CRYPTO_DEVS_CONTRACT_ADDRESS,
      cryptoDevsAbi,
      provider
    );

    return cryptoDevsContract;
  }

  const getOwner = async () => {
    try {
      const cryptoDevsContract = await getCryptoDevsContractInstance();
      const _owner = await cryptoDevsContract.owner();

      const signer = await getProviderOrSigner(true);
      const currentAddress = await signer.getAddress();

      if (currentAddress.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (error) {
      console.error(error);
    }
  }

  const checkIfPresaleStarted = async () => {
    try {
      const cryptoDevsContract = await getCryptoDevsContractInstance();

      const _presaleStarted = await cryptoDevsContract.presaleStarted();
      if (!_presaleStarted) {
        await getOwner();
      }

      setPresaleStarted(_presaleStarted);
      return _presaleStarted;
    } catch (error) {
      console.error(error);
    }
  }

  const checkIfPresaleEnded = async () => {
    try {
      const cryptoDevsContract = await getCryptoDevsContractInstance();
      const _presaleEnd = await cryptoDevsContract.presaleEnd();
      
      const hasEnded = _presaleEnd.lt(Math.floor(Date.now() / 1000));
      setPresaleEnded(hasEnded);
      return hasEnded;
    } catch (error) {
      console.error(error);
    }
  }

  const startPresale = async () => {
    try {
      const cryptoDevsContract = await getCryptoDevsContractInstance(true);

      const tx = await cryptoDevsContract.startPresale();
      setLoading(true);
      await tx.wait();
      setLoading(false);

      await checkIfPresaleStarted();
    } catch (error) {
      console.error(error);
    }
  }

  const presaleMint = async () => {
    try {
      const cryptoDevsContract = await getCryptoDevsContractInstance(true);

      const tx = await cryptoDevsContract.presaleMint({
        value: utils.parseEther("0.01")
      });

      setLoading(true);
      await tx.wait();
      setLoading(false);
      window.alert('You successfully minted a Crypto Dev!');
    } catch (err) {
      console.error(err);
    }
  }

  const publicMint = async () => {
    try {
      const cryptoDevsContract = await getCryptoDevsContractInstance(true);
  
      const tx = await cryptoDevsContract.mint({
        value: utils.parseEther('0.01')
      });
  
      setLoading(true);
      await tx.wait();
      setLoading(false);
      window.alert('You successfully minted a Crypto Dev!');
    } catch (err) {
      console.error(err);
    }
  }

  const getTokenIdsMinted = async () => {
    try {
      const cryptoDevsContract = await getCryptoDevsContractInstance();
      const _tokenIds = await cryptoDevsContract.tokenIds();
      setTokenIdsMinted(_tokenIds.toString());
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: 'rinkeby',
        providerOptions: {},
        disableInjectedProvider: false
      });
      connectWallet();

      const _presaleStarted = checkIfPresaleStarted();
      if (_presaleStarted) {
        checkIfPresaleEnded();
      }

      getTokenIdsMinted();

      const presaleEndedInterval = setInterval(async () => {
        const _presaleStarted = await checkIfPresaleStarted();
        if (_presaleStarted) {
          const _presaleEnded = await checkIfPresaleEnded();
          if (_presaleEnded) {
            clearInterval(presaleEndedInterval);
          }
        }
      }, 5000);
    }
  }, [walletConnected]);

  const renderButton = () => {
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }

    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }

    if (!presaleStarted) {
      if (isOwner) {
        return (
          <button className={styles.button} onClick={startPresale}>
            Start Presale!
          </button>
        );
      } else {
        return (
          <div>
            <div className={styles.description}>Presale hasnt started yet!</div>
          </div>
        );
      }
    }

    if (presaleStarted) {
      if (!presaleEnded) {
        return (
          <div>
            <div className={styles.description}>
              Presale has started! If your address is whitelisted you can mint a Crypto Dev!
            </div>
            <button className={styles.button} onClick={presaleMint}>
              Presale Mint 🚀
            </button>
          </div>
        );
      } else {
        return (
          <button className={styles.button} onClick={publicMint}>
            Public Mint 🚀
          </button>
        );
      }
    }
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs Dapp</title>
        <meta name="description" content="Crypto Devs Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>
            Its an NFT collection for developers in Crypto.
          </div>
          <div className={styles.description}>
            {tokenIdsMinted}/20 have been minted
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./cryptodevs/0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made by 0x736d3dABA2810df11729CB51a4fa938749F9a457
      </footer>
    </div>
  );
}