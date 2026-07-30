import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { RoutesComponent } from './templates/ViewComponents';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const Index = () => {

	return (
		<QueryClientProvider client={queryClient}>
			<RoutesComponent />
		</QueryClientProvider>
	);
};
