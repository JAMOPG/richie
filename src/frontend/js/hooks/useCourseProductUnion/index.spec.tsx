import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import fetchMock from 'fetch-mock';
import { PropsWithChildren } from 'react';
import { CourseListItem, CourseProductRelation } from 'types/Joanie';
import { RichieContextFactory as mockRichieContextFactory } from 'utils/test/factories/richie';
import { createTestQueryClient } from 'utils/test/createTestQueryClient';
import { SessionProvider } from 'contexts/SessionContext';
import { getRoutes } from 'api/joanie';
import { mockPaginatedResponse } from 'utils/test/mockPaginatedResponse';
import { CourseListItemFactory, CourseProductRelationFactory } from 'utils/test/factories/joanie';
import { BaseJoanieAppWrapper } from 'utils/test/wrappers/BaseJoanieAppWrapper';
import { useCourseProductUnion } from '.';

jest.mock('utils/context', () => ({
  __esModule: true,
  default: mockRichieContextFactory({
    authentication: { backend: 'fonzie', endpoint: 'https://demo.endpoint' },
    joanie_backend: { endpoint: 'https://joanie.endpoint' },
  }).one(),
}));

const PER_PAGE = 3;

const renderUseCourseProductUnion = ({ organizationId }: { organizationId?: string } = {}) => {
  const Wrapper = ({
    client = createTestQueryClient({ user: true }),
    children,
  }: PropsWithChildren<{ client?: QueryClient }>) => {
    return (
      <BaseJoanieAppWrapper queryOptions={{ client }}>
        <SessionProvider>{children}</SessionProvider>
      </BaseJoanieAppWrapper>
    );
  };

  return renderHook(() => useCourseProductUnion({ perPage: PER_PAGE, organizationId }), {
    wrapper: Wrapper,
  });
};

describe('useCourseProductUnion', () => {
  let courseList: CourseListItem[];
  let courseProductRelationList: CourseProductRelation[];
  let nbApiCalls: number;

  beforeEach(() => {
    courseList = CourseListItemFactory().many(6);
    courseProductRelationList = CourseProductRelationFactory().many(6);

    fetchMock.get('https://joanie.endpoint/api/v1.0/orders/', [], { overwriteRoutes: true });
    fetchMock.get('https://joanie.endpoint/api/v1.0/credit-cards/', [], { overwriteRoutes: true });
    fetchMock.get('https://joanie.endpoint/api/v1.0/addresses/', [], { overwriteRoutes: true });
    nbApiCalls = 3;
  });

  afterEach(() => {
    jest.clearAllMocks();
    fetchMock.restore();
  });

  it('should call courses and coursesProductRelation endpoints', async () => {
    const ROUTES = getRoutes();
    const coursesUrl = ROUTES.courses.get.replace(':id/', '');
    const courseProductRelationsUrl = ROUTES.courseProductRelations.get.replace(':id/', '');
    fetchMock.get(
      `${coursesUrl}?has_listed_course_runs=true&page=1&page_size=${PER_PAGE}`,
      mockPaginatedResponse(courseList.slice(0, PER_PAGE), 0, false),
    );
    fetchMock.get(
      `${courseProductRelationsUrl}?page=1&page_size=${PER_PAGE}`,
      mockPaginatedResponse(courseProductRelationList.slice(0, PER_PAGE), 0, false),
    );
    const { result } = renderUseCourseProductUnion();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data.length).toBe(PER_PAGE);
    nbApiCalls += 1; // courses page 1
    nbApiCalls += 1; // course product relations page 1
    const calledUrls = fetchMock.calls().map((call) => call[0]);
    expect(calledUrls).toHaveLength(nbApiCalls);
    expect(calledUrls).toContain(
      `${coursesUrl}?has_listed_course_runs=true&page=1&page_size=${PER_PAGE}`,
    );
    expect(calledUrls).toContain(`${courseProductRelationsUrl}?page=1&page_size=${PER_PAGE}`);
  }, 25000);

  it('should call organization courses and organization coursesProductRelation endpoints', async () => {
    const organizationId = 'DUMMY_ORGANIZATION_ID';
    const ROUTES = getRoutes();
    const organizationCoursesUrl = ROUTES.organizations.courses.get
      .replace(':organization_id', organizationId)
      .replace(':id/', '');
    const organizationCourseProductRelationsUrl = ROUTES.organizations.courseProductRelations.get
      .replace(':organization_id', organizationId)
      .replace(':id/', '');
    fetchMock.get(
      `${organizationCoursesUrl}?has_listed_course_runs=true&page=1&page_size=${PER_PAGE}`,
      mockPaginatedResponse(courseList.slice(0, PER_PAGE), 0, false),
    );
    fetchMock.get(
      `${organizationCourseProductRelationsUrl}?page=1&page_size=${PER_PAGE}`,
      mockPaginatedResponse(courseProductRelationList.slice(0, PER_PAGE), 0, false),
    );
    const { result } = renderUseCourseProductUnion({ organizationId: 'DUMMY_ORGANIZATION_ID' });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data.length).toBe(PER_PAGE);
    nbApiCalls += 1; // courses page 1
    nbApiCalls += 1; // course product relations page 1
    const calledUrls = fetchMock.calls().map((call) => call[0]);
    expect(calledUrls).toHaveLength(nbApiCalls);
    expect(calledUrls).toContain(
      `${organizationCoursesUrl}?has_listed_course_runs=true&page=1&page_size=${PER_PAGE}`,
    );
    expect(calledUrls).toContain(
      `${organizationCourseProductRelationsUrl}?page=1&page_size=${PER_PAGE}`,
    );
  });
});
