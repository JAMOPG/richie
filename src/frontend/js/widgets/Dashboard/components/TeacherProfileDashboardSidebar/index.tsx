import { defineMessages, useIntl } from 'react-intl';
import { useMemo } from 'react';
import { TeacherDashboardPaths } from 'widgets/Dashboard/utils/teacherRouteMessages';
import { DashboardSidebar } from 'widgets/Dashboard/components/DashboardSidebar';
import {
  getDashboardRouteLabel,
  getDashboardRoutePath,
} from 'widgets/Dashboard/utils/dashboardRoutes';
import { useSession } from 'contexts/SessionContext';

const messages = defineMessages({
  header: {
    id: 'components.TeacherProfileDashboardSidebar.header',
    description: 'Title of the dashboard sidebar',
    defaultMessage: '{name}',
  },
  subHeader: {
    id: 'components.TeacherProfileDashboardSidebar.subHeader',
    description: 'Sub title of the dashboard sidebar',
    defaultMessage: 'You are on your teacher dashboard',
  },
});

export const TeacherProfileDashboardSidebar = () => {
  const intl = useIntl();
  const { user } = useSession();
  const getRoutePath = getDashboardRoutePath(intl);
  const getRouteLabel = getDashboardRouteLabel(intl);

  const links = useMemo(
    () =>
      [
        TeacherDashboardPaths.TEACHER_COURSES,
        TeacherDashboardPaths.TEACHER_NOTIFICATIONS,
        TeacherDashboardPaths.TEACHER_SETTINGS,
      ].map((path) => ({
        to: getRoutePath(path),
        label: getRouteLabel(path),
      })),
    [],
  );

  return (
    <DashboardSidebar
      menuLinks={links}
      header={intl.formatMessage(messages.header, { name: user?.username })}
      subHeader={intl.formatMessage(messages.subHeader)}
    />
  );
};
