import { TOP } from "../Components/Pages/top";
import { Contact } from '../Components/Pages/contact';


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
