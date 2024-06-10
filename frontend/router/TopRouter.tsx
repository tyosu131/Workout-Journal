import { TOP } from "../components/Pages/top";
import { Contact } from '../components/Pages/contact';


export const homeRoutes = [
  {
    path: "/",
    exact: true,
    children: <TOP />,
  },
  {
    path: "/contact",
    exact: false,
    children: <Contact />,
  },
//   {
//     path: "/setting",
//     exact: false,
//     children: <Setting />,
//   },
//   {
//     path: "*",
//     exact: false,
//     children: <Page404 />,
//   },
];
