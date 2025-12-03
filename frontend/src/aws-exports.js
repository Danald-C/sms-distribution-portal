import { Amplify } from "aws-amplify";
import awsExports from "./aws-exports";
Amplify.configure(awsExports);
import { withAuthenticator } from "@aws-amplify/ui-react";

function App({ signOut, user }) {
    return (
    <div>
        <h1>Welcome {user.username}</h1>
        <button onClick={signOut}>Sign out</button>
    </div>
    );
}

export default withAuthenticator(App);