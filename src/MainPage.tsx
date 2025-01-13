import React from "react";
import logo from "./assets/logo.svg";
import { Icon } from "./components/Icon";
import { CheckCheck } from "lucide-react";
import { CardBody, Card } from "@nextui-org/react";

const MainPage = () => {
  return (
    <div>
      <header className="flex flex-col items-center justify-center h-screen">
        <img src={logo} className="App-logo" alt="logo" width="60" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
          Learn React
        </a>
        <Card>
          <CardBody>
            <p>Make beautiful websites regardless of your design experience.</p>
          </CardBody>
        </Card>
        <Icon icon={CheckCheck} color="red" size={48} />
      </header>
    </div>
  );
};

export default MainPage;
